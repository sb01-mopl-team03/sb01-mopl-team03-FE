# 모플 (MOPL) - 한국 스트리밍 플랫폼

React + TypeScript + Vite로 개발된 스트리밍 플랫폼 프론트엔드입니다.

## 일반 실행 방법

### `npm run dev`

개발 모드로 앱을 실행합니다.\
[http://localhost:3000](http://localhost:3000)에서 확인할 수 있습니다.

### `npm run build`

프로덕션용으로 앱을 빌드합니다.\
`dist` 폴더에 최적화된 빌드가 생성됩니다.

### `npm run preview`

빌드된 앱을 로컬에서 미리 확인할 수 있습니다.

## Docker로 실행하기

### 방법 1: 간단한 방법 (권장)
nginx 없이 vite preview 서버를 사용하는 방법입니다.

```bash
# 1. 이미지 빌드
docker build -f Dockerfile.simple -t mopl-frontend-simple .

# 2. 컨테이너 실행
docker run -p 3000:3000 mopl-frontend-simple

# 3. 접속
# http://localhost:3000
```

> **참고:** Docker 컨테이너는 `host.docker.internal:8080`을 통해 호스트의 백엔드에 접근합니다.

### 방법 2: nginx 사용
프로덕션 환경에서 더 안정적인 nginx를 사용하는 방법입니다.

```bash
# 1. 이미지 빌드
docker build -t mopl-frontend .

# 2. 컨테이너 실행
docker run -p 3000:3000 mopl-frontend

# 3. 접속
# http://localhost:3000
```

> **참고:** nginx 방식에서는 host.docker.internal을 사용해 백엔드에 접근하므로 추가 설정이 필요 없습니다.