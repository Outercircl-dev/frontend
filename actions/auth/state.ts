export type VerifyEmailState = {
    status: 'idle' | 'success' | 'error'
    message: string
}

export const verifyEmailInitialState: VerifyEmailState = {
    status: 'idle',
    message: '',
}

