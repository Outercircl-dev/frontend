// Copyright (c) 2026 Outer Circle. All rights reserved.

export type VerifyEmailState = {
    status: 'idle' | 'success' | 'error'
    message: string
}

export const verifyEmailInitialState: VerifyEmailState = {
    status: 'idle',
    message: '',
}

