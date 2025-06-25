export type ToastType = 'copy' | 'default' | 'error'

export interface ToastParams {
  type: ToastType
  title: string
  content?: string
  description?: string
}
