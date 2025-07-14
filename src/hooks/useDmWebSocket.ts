import { useState, useEffect, useCallback, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import { DmDto, DmRequest } from '../services/dmService';

interface UseDmWebSocketProps {
  roomId: string | null;
  userId: string | null;
  onMessageReceived: (message: DmDto) => void;
}

export const useDmWebSocket = ({ roomId, userId, onMessageReceived }: UseDmWebSocketProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const clientRef = useRef<Client | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  const scheduleReconnect = useCallback(() => {
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
    console.log(`Scheduling reconnect attempt ${reconnectAttemptsRef.current + 1} in ${delay}ms`);
    
    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectAttemptsRef.current++;
      connect();
    }, delay);
  }, []);

  const connect = useCallback(() => {
    if (!roomId || !userId || isConnecting || isConnected) return;

    const token = localStorage.getItem('accessToken');
    if (!token) {
      console.error('No access token found for WebSocket connection');
      return;
    }

    console.log('Connecting to DM WebSocket for room:', roomId, 'Attempt:', reconnectAttemptsRef.current + 1);
    setIsConnecting(true);

    const client = new Client({
      brokerURL: `${import.meta.env.VITE_BACKEND_WS_URL || 'ws://localhost:8080'}/ws`,
      connectHeaders: {
        Authorization: `Bearer ${token}`
      },
      debug: (str) => {
        console.log('STOMP Debug:', str);
      },
      onConnect: () => {
        console.log('DM WebSocket connected for room:', roomId);
        setIsConnected(true);
        setIsConnecting(false);
        reconnectAttemptsRef.current = 0; // Reset attempts on successful connection

        // Subscribe to the room's topic
        client.subscribe(`/topic/dm.room.${roomId}`, (message) => {
          try {
            const dmMessage: DmDto = JSON.parse(message.body);
            console.log('Received DM message:', dmMessage);
            onMessageReceived(dmMessage);
          } catch (error) {
            console.error('Error parsing DM message:', error);
          }
        });
      },
      onDisconnect: () => {
        console.log('DM WebSocket disconnected');
        setIsConnected(false);
        setIsConnecting(false);
        
        // Schedule reconnect if not intentionally disconnected
        if (clientRef.current && reconnectAttemptsRef.current < maxReconnectAttempts) {
          scheduleReconnect();
        }
      },
      onStompError: (frame) => {
        console.error('STOMP Error:', frame);
        setIsConnected(false);
        setIsConnecting(false);
        
        // Schedule reconnect on error
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          scheduleReconnect();
        }
      }
    });

    clientRef.current = client;
    client.activate();
  }, [roomId, userId, isConnecting, isConnected, onMessageReceived, scheduleReconnect]);

  const disconnect = useCallback(() => {
    // Clear any pending reconnect attempts
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    // Reset reconnect attempts
    reconnectAttemptsRef.current = 0;
    
    if (clientRef.current) {
      console.log('Disconnecting DM WebSocket');
      clientRef.current.deactivate();
      clientRef.current = null;
      setIsConnected(false);
      setIsConnecting(false);
    }
  }, []);

  const sendMessage = useCallback((content: string) => {
    if (!clientRef.current || !isConnected || !roomId || !userId) {
      console.error('Cannot send message: WebSocket not connected or missing required data');
      return;
    }

    const dmRequest: DmRequest = {
      senderId: userId,
      roomId: roomId,
      content: content,
      isRead: false,
      createdAt: new Date().toISOString()
    };

    console.log('Sending DM message:', dmRequest);

    clientRef.current.publish({
      destination: '/app/dm.send',
      body: JSON.stringify(dmRequest)
    });
  }, [roomId, userId, isConnected]);

  // Effect to handle connection/disconnection based on roomId
  useEffect(() => {
    if (roomId && userId) {
      connect();
    } else {
      disconnect();
    }

    // Cleanup on unmount
    return () => {
      // Clear any pending reconnect attempts
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      disconnect();
    };
  }, [roomId, userId, connect, disconnect]);

  return {
    isConnected,
    isConnecting,
    sendMessage,
    connect,
    disconnect
  };
};