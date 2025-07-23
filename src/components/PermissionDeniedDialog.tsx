import { Crown } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert_dialog'

interface PermissionDeniedDialogProps {
  open: boolean
  onClose: () => void
}

export function PermissionDeniedDialog({ open, onClose }: PermissionDeniedDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent className="bg-[#1a1a1a] border-white/20 text-white">
        <AlertDialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center">
              <Crown className="w-8 h-8 text-yellow-400" />
            </div>
          </div>
          <AlertDialogTitle className="text-center text-xl font-medium">
            제어 권한이 없습니다
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center text-white/70">
            호스트만 비디오를 제어할 수 있습니다.
            <br />
            재생, 일시정지, 구간 이동은 방장만 가능합니다.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction 
            onClick={onClose}
            className="w-full teal-gradient hover:opacity-80 text-black font-medium"
          >
            확인
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}