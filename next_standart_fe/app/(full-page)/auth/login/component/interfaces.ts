export interface LoginFormik {
    username: string
    password: string
    remember_me: boolean | string
}

export interface LoginState {
    load: boolean;
    googleLoad: boolean;
}