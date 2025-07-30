// ChatRoom.tsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ArrowLeft, Send, Image, Smile, X } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { ScrollArea } from './ui/scroll-area';
import { DmDto, CursorPageResponseDto, DmPagingDto } from '../services/dmService';
import { useDmWebSocket } from '../hooks/useDmWebSocket';

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: string;
  type: 'text' | 'image';
  isOwnMessage: boolean;
}

interface ChatUser {
  id: string;
  name: string;
  avatar: string;
  isOnline: boolean;
  roomId: string;
}

interface ChatRoomProps {
  isOpen: boolean;
  onClose: () => void;
  onBack: () => void;
  user: ChatUser | null;
  currentUserId: string | null;
  getDmMessages: (roomId: string, pagingDto?: DmPagingDto) => Promise<CursorPageResponseDto<DmDto>>;
  refreshTrigger?: number;
}

export function ChatRoom({ isOpen, onClose, onBack, user, currentUserId, getDmMessages, refreshTrigger }: ChatRoomProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const previousScrollHeight = useRef<number>(0);

  const lastLoadedRoomRef = useRef<string | null>(null);
  const shouldScrollToBottomRef = useRef<boolean>(false);
  const isInitializingRef = useRef<boolean>(false);
  const userCanScrollRef = useRef<boolean>(false);
  const isLoadingOlderRef = useRef<boolean>(false);
  const isProgrammaticScroll = useRef<boolean>(false);

  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // WebSocket connection
  const { isConnected, sendMessage, enterRoom: _enterRoom, exitRoom: _exitRoom } = useDmWebSocket({
    roomId: user?.roomId || null,
    userId: currentUserId,
    onMessageReceived: (dmMessage: DmDto) => {
      const message: Message = {
        id: dmMessage.id,
        senderId: dmMessage.senderId,
        senderName: dmMessage.senderId === currentUserId ? '나' : user?.name || 'Unknown',
        // Ensure dmMessage.createdAt is a string, provide fallback if null/undefined
        content: dmMessage.content,
        timestamp: formatTimestamp(dmMessage.createdAt || new Date().toISOString()), 
        type: 'text',
        isOwnMessage: dmMessage.senderId === currentUserId,
      };
    },
    onError: (error: string) => {
      console.error('❌ DM WebSocket 에러:', error);

      if (error.includes('로그인') || error.includes('인증') || error.includes('Authentication')) {
        setAuthError(error);
        setError(null);
      } else {
        setError(error);
        setAuthError(null);
      }
    },
  });


  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]); // messages가 변경될 때마다 아래로 스크롤

  // 초기 로드 시에만 최하단으로 스크롤 (사용자 스크롤 허용 시점 제어)
  useEffect(() => {
    if (!loading && messages.length > 0 && shouldScrollToBottomRef.current) {
      isProgrammaticScroll.current = true;

      const scrollTimeout = setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
        shouldScrollToBottomRef.current = false;
        isProgrammaticScroll.current = false;

        const enableUserScrollTimeout = setTimeout(() => {
          userCanScrollRef.current = true;
        }, 300);

        return () => clearTimeout(enableUserScrollTimeout);
      }, 150);

      return () => clearTimeout(scrollTimeout);
    }
  }, [loading, messages.length]);

  // 새 메시지 수신 시 자동 스크롤 (사용자가 하단 근처에 있을 때만)
  useEffect(() => {
    if (messages.length > 0 && scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        const { scrollTop, scrollHeight, clientHeight } = scrollElement;
        const isNearBottom = scrollTop + clientHeight >= scrollHeight - 100;

        if (isNearBottom) {
          isProgrammaticScroll.current = true;
          const autoScrollTimeout = setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            isProgrammaticScroll.current = false;
          }, 50);
          return () => clearTimeout(autoScrollTimeout);
        }
      }
    }
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }

    if (!isOpen) {
      isInitializingRef.current = false;
      userCanScrollRef.current = false;
      isProgrammaticScroll.current = false;
      isLoadingOlderRef.current = false;
    }
  }, [isOpen]);

  // DM방 접속 시 최신 메시지 로드 (매번 실행하여 항상 최신 메시지 보장)
  useEffect(() => {
    if (!user?.roomId || !isOpen) {
      return;
    }

    const roomId = user.roomId;

    if (!isInitializingRef.current) {
      lastLoadedRoomRef.current = roomId;
      shouldScrollToBottomRef.current = true;
      resetAndLoadMessages();
    }
  }, [user?.roomId, isOpen]);

  // refreshTrigger 전용 useEffect (새로고침 시에만)
  useEffect(() => {
    if (!user?.roomId || !isOpen || !refreshTrigger || refreshTrigger === 0) {
      return;
    }

    if (!isInitializingRef.current) {
      resetAndLoadMessages();
    }
  }, [refreshTrigger, user?.roomId, isOpen]);

  // 컴포넌트 언마운트 또는 방 변경 시 초기화 상태 리셋
  useEffect(() => {
    return () => {
      isInitializingRef.current = false;
      userCanScrollRef.current = false;
      isProgrammaticScroll.current = false;
      isLoadingOlderRef.current = false;
    };
  }, [user?.roomId]);

  // 컴포넌트 언마운트 시 디바운스 타이머 클리어
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  const formatTimestamp = (dateString: string) => {
    // Add a check to ensure dateString is valid before creating a Date object
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      // If the date is invalid, return a placeholder or an empty string
      console.warn('Invalid date string provided:', dateString);
      return '시간 정보 없음'; // Or a more appropriate fallback
    }
    return date.toLocaleTimeString('ko-KR', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const resetAndLoadMessages = async () => {
    if (isInitializingRef.current || loading || loadingMore || isLoadingOlderRef.current) {
      return;
    }

    isInitializingRef.current = true;

    try {
      setMessages([]);
      setNextCursor(null);
      setHasMore(true);
      setError(null);
      setAuthError(null);

      await loadLatestMessages();
    } catch (error) {
      console.error('❌ resetAndLoadMessages 에러:', error);
      setError('메시지를 불러올 수 없습니다.');
    } finally {
      isInitializingRef.current = false;
    }
  };

  const loadLatestMessages = async () => {
    if (!user?.roomId) {
      return;
    }

    if (loading) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await getDmMessages(user.roomId, { size: 20 });

      const newMessages: Message[] = response.data
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        .map((dm: DmDto) => ({
          id: dm.id,
          senderId: dm.senderId,
          senderName: dm.senderId === currentUserId ? '나' : user?.name || 'Unknown',
          // Ensure dm.createdAt is a string, provide fallback if null/undefined
          content: dm.content,
          timestamp: formatTimestamp(dm.createdAt || new Date().toISOString()),
          type: 'text',
          isOwnMessage: dm.senderId === currentUserId,
        }));

      setMessages(newMessages);
      setHasMore(response.hasNext);
      setNextCursor(response.nextCursor);
    } catch (error) {
      console.error('❌ 최신 메시지 로딩 에러:', error);
      setError('최신 메시지를 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  const loadOlderMessages = useCallback(async () => {
    if (!user?.roomId || !nextCursor || !hasMore) {
      return;
    }

    if (isLoadingOlderRef.current) {
      return;
    }

    isLoadingOlderRef.current = true;
    setLoadingMore(true);
    setError(null);

    const scrollElement = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (scrollElement) {
      previousScrollHeight.current = scrollElement.scrollHeight;
    }

    try {
      const pagingDto: DmPagingDto = {
        size: 20,
        cursor: nextCursor,
      };

      const response = await getDmMessages(user.roomId, pagingDto);

      const newMessages: Message[] = response.data
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        .map((dm: DmDto) => ({
          id: dm.id,
          senderId: dm.senderId,
          senderName: dm.senderId === currentUserId ? '나' : user?.name || 'Unknown',
          // Ensure dm.createdAt is a string, provide fallback if null/undefined
          content: dm.content,
          timestamp: formatTimestamp(dm.createdAt || new Date().toISOString()),
          type: 'text',
          isOwnMessage: dm.senderId === currentUserId,
        }));

      setMessages((prev) => {
        const existingIds = new Set(prev.map((msg) => msg.id));
        const uniqueNewMessages = newMessages.filter((msg) => !existingIds.has(msg.id));
        return [...uniqueNewMessages, ...prev];
      });

      setHasMore(response.hasNext);
      setNextCursor(response.nextCursor);
    } catch (error) {
      console.error('❌ 이전 메시지 로딩 에러:', error);
      setError('이전 메시지를 불러올 수 없습니다.');
    } finally {
      setLoadingMore(false);
      isLoadingOlderRef.current = false;
    }
  }, [user?.roomId, nextCursor, hasMore, currentUserId, getDmMessages]);

  // 이전 메시지 로드 후 스크롤 위치 유지
  useEffect(() => {
    if (!loadingMore && previousScrollHeight.current > 0 && scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        isProgrammaticScroll.current = true;
        const newScrollHeight = scrollElement.scrollHeight;
        const scrollDiff = newScrollHeight - previousScrollHeight.current;
        
        scrollElement.scrollTop = scrollDiff;
        previousScrollHeight.current = 0;

        const programmaticScrollEndTimeout = setTimeout(() => {
          isProgrammaticScroll.current = false;
        }, 150);
        return () => clearTimeout(programmaticScrollEndTimeout);
      }
    }
  }, [messages, loadingMore]);

  // 스크롤 이벤트 핸들러 - 최상단에서 이전 메시지 로드 (사용자 스크롤만)
  const handleScroll = useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      const scrollElement = event.currentTarget;
      const { scrollTop, scrollHeight, clientHeight } = scrollElement;

      const cond1 = !isProgrammaticScroll.current;
      const cond2 = userCanScrollRef.current;
      const cond3 = scrollTop <= 10;
      const cond4 = hasMore;
      const cond5 = !isLoadingOlderRef.current;
      const cond6 = !loading;
      const cond7 = messages.length >= 20 || scrollHeight > clientHeight;

      if (cond1 && cond2 && cond3 && cond4 && cond5 && cond6 && cond7) {
        if (debounceTimeoutRef.current) {
          clearTimeout(debounceTimeoutRef.current);
        }

        debounceTimeoutRef.current = setTimeout(() => {
          loadOlderMessages();
          debounceTimeoutRef.current = null;
        }, 100);
      } else {
        if (debounceTimeoutRef.current) {
          clearTimeout(debounceTimeoutRef.current);
          debounceTimeoutRef.current = null;
        }
      }
    },
    [hasMore, loading, loadOlderMessages, messages.length],
  );

  const handleSendMessage = () => {
    if (!newMessage.trim() || !user || !isConnected) {
      console.warn('⚠️ 메시지 전송 실패:', {
        hasMessage: !!newMessage.trim(),
        hasUser: !!user,
        isConnected,
        roomId: user?.roomId,
        userId: currentUserId,
      });
      return;
    }
    console.log('📤 ChatRoom에서 메시지 전송:', {
      content: newMessage.trim(),
      roomId: user.roomId,
      userId: currentUserId,
      isConnected,
    });
    sendMessage(newMessage.trim());
    setNewMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Removed, as it's now handled by the formatTimestamp function directly
  // const formatMessageTime = (timestamp: string) => {
  //   const date = new Date(timestamp);
  //   return date.toLocaleTimeString('ko-KR', {
  //     hour: 'numeric',
  //     minute: '2-digit',
  //     hour12: true,
  //   });
  // };

  if (!isOpen || !user) return null;

  return (
    <div className="fixed bottom-20 right-6 w-96 h-[520px] z-50 animate-in slide-in-from-right-5 fade-in duration-200">
      <div
        className="rounded-2xl border border-white/20 h-full flex flex-col"
        style={{
          backdropFilter: 'blur(12px)',
          background: 'rgba(26, 26, 26, 0.95)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="sm" onClick={onBack} className="p-1 hover:bg-white/10">
              <ArrowLeft className="w-4 h-4" />
            </Button>

            <div className="flex items-center space-x-3">
              <div className="relative">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.avatar} />
                  <AvatarFallback className="bg-[#4ecdc4] text-black text-sm">
                    {user.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                {user.isOnline && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-background"></div>
                )}
              </div>

              <div>
                <p className="font-medium text-sm">{user.name}</p>
                <p className="text-xs text-white/60">
                  {/* {user.isOnline ? '온라인' : ''}
                  {' • '}
                  <span className={`${isConnected ? 'text-green-400' : 'text-red-400'}`}>
                    {isConnected ? '연결됨' : '연결 안됨'}
                  </span> */}
                </p>
              </div>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="p-2 hover:bg-white/10">
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Messages - Fixed height with proper scrolling */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea ref={scrollAreaRef} className="h-full" onScrollCapture={handleScroll}>
            <div className="p-4 space-y-4">
              {/* 이전 메시지 로딩 인디케이터 */}
              {loadingMore && (
                <div className="flex items-center justify-center py-2 text-white/60">
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin"></div>
                  <span className="text-sm">이전 메시지 불러오는 중...</span>
                </div>
              )}
              {/* 더 이상 불러올 메시지가 없을 때 */}
              {!hasMore && messages.length > 0 && !loading && (
                <div className="flex items-center justify-center py-2 text-white/40">
                  <span className="text-sm">대화의 시작입니다</span>
                </div>
              )}
              {loading && (
                <div className="flex items-center justify-center h-32 text-white/60">
                  메시지를 불러오는 중...
                </div>
              )}
              {error && (
                <div className="flex items-center justify-center h-32 text-red-400">
                  {error}
                </div>
              )}
              {authError && (
                <div className="flex items-center justify-center h-32 text-orange-400">
                  <div className="text-center">
                    <p className="mb-3">{authError}</p>
                    <Button
                      onClick={() => {
                        setAuthError(null);
                      }}
                      size="sm"
                      className="bg-orange-500 hover:bg-orange-600 text-white"
                    >
                      다시 시도
                    </Button>
                  </div>
                </div>
              )}
              {!loading && !error && !authError && messages.length === 0 && !loadingMore && (
                <div className="flex items-center justify-center h-32 text-white/60">
                  아직 메시지가 없습니다.
                </div>
              )}

              {messages.map((message, index) => {
                const previousMessage = messages[index - 1];
                let showTime = true;

                if (
                  index > 0 &&
                  previousMessage &&
                  previousMessage.senderId === message.senderId &&
                  previousMessage.timestamp === message.timestamp
                ) {
                  showTime = false;
                }
                const nextMessage = messages[index + 1];
                if (!nextMessage || nextMessage.senderId !== message.senderId || nextMessage.timestamp !== message.timestamp) {
                  showTime = true;
                }


                return (
                  <div key={message.id} className={`flex ${message.isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] ${message.isOwnMessage ? 'order-2' : 'order-1'}`}>
                      {!message.isOwnMessage && (
                        <div className="flex items-center space-x-2 mb-1">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={user.avatar} />
                            <AvatarFallback className="bg-[#4ecdc4] text-black text-xs">
                              {user.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-white/60">{message.senderName}</span>
                        </div>
                      )}

                      <div
                        className={`rounded-2xl px-4 py-2 break-words ${
                          message.isOwnMessage ? 'bg-[#4ecdc4] text-black' : 'bg-white/10 text-white'
                        }`}
                      >
                        <p className="text-sm leading-relaxed">{message.content}</p>
                      </div>

                      {showTime && (
                        <p
                          className={`text-xs text-white/40 mt-1 ${
                            message.isOwnMessage ? 'text-right' : 'text-left'
                          }`}
                        >
                          {/* Use formatTimestamp directly here */}
                          {message.timestamp}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}

              {isTyping && (
                <div className="flex justify-start">
                  <div className="flex items-center space-x-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={user.avatar} />
                      <AvatarFallback className="bg-[#4ecdc4] text-black text-xs">
                        {user.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="bg-white/10 rounded-2xl px-4 py-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
        </div>

        {/* Input - Fixed at bottom */}
        <div className="p-4 border-t border-white/10 flex-shrink-0">
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" className="p-2 hover:bg-white/10 flex-shrink-0">
              <Image className="w-5 h-5" />
            </Button>

            <div className="flex-1 relative">
              <Input
                ref={inputRef}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="메시지를 입력하세요..."
                className="pr-12 h-12 px-4 text-base bg-white/5 border-white/20 focus:border-[#4ecdc4] rounded-full"
              />

              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 p-2 hover:bg-white/10"
              >
                <Smile className="w-4 h-4" />
              </Button>
            </div>

            <Button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || !isConnected}
              size="sm"
              className="p-2 bg-[#4ecdc4] hover:bg-[#26a69a] text-black disabled:opacity-50 disabled:hover:bg-[#4ecdc4] rounded-full flex-shrink-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}