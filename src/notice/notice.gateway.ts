import { Server } from 'socket.io'
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets'

interface NoticeMessage {
  type: 'Error' | 'Success' | 'Warning'
  message: string
  error?: Error
}

@WebSocketGateway(undefined, { transports: ['websocket', 'polling'] })
export class NoticeGateway {
  @WebSocketServer()
  public readonly socket: Server

  public send (content: NoticeMessage): void {
    this.socket.emit('message', content)
  }

  public handleErrorMessage (content: NoticeMessage): (error: Error) => void {
    return (error) => {
      this.send({
        ...content,
        error
      })
    }
  }
}
