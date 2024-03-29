import { createSlice } from '@reduxjs/toolkit'
import { appAction } from 'app/app-reducer'
import { todolistsAction } from 'features/ListOfTodolists/model/todolists-reducer'
import { authAPI } from 'features/Login/api/auth-api'
import { FormType, ResultCodes } from 'common/types/api_types'
import { createAppAsyncThunk, handleServerAppError } from 'common/utils'
import { AuthStateType } from 'common/types/app-types'
import { handlerTryCatchThunk } from 'common/utils/handlerTryCatchThunk'

const slice = createSlice({
  name: 'auth',
  initialState: {
    isAuth: false,
    authUserLogin: null,
  } as AuthStateType,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(authThunk.checkIsAuth.fulfilled, (state, { payload }) => {
        state.isAuth = true
        state.authUserLogin = payload.userLogin
      })
      .addCase(authThunk.logOut.fulfilled, (state, { payload }) => {
        state.isAuth = false
        state.authUserLogin = payload.userLogin
      })
  },
})

export type AuthReducerState = ReturnType<typeof slice.getInitialState>

const checkIsAuth = createAppAsyncThunk<{ userLogin: string | null }, {}>('auth/checkIsAuth', async (_, thunkAPI) => {
  const { dispatch, rejectWithValue } = thunkAPI

  return handlerTryCatchThunk(thunkAPI, async () => {
    const response = await authAPI.checkIsLogIn()
    if (response.data.resultCode !== ResultCodes.OK) {
      handleServerAppError(response.data, dispatch, false)
      return rejectWithValue(response.data)
    } else {
      return { userLogin: response.data.data.login }
    }
  }).finally(() => dispatch(appAction.setIsInitialized({ isInitialized: true })))
})

const logIn = createAppAsyncThunk<undefined, FormType>('auth/logIn', async (data, thunkAPI) => {
  const { dispatch, rejectWithValue } = thunkAPI

  return handlerTryCatchThunk(thunkAPI, async () => {
    const response = await authAPI.logIn(data)
    if (response.data.resultCode !== ResultCodes.OK) {
      handleServerAppError(response.data, dispatch)
      return rejectWithValue(null)
    } else {
      dispatch(authThunk.checkIsAuth({}))
    }
  })
})

const logOut = createAppAsyncThunk<{ userLogin: string | null }, {}>('auth/logOut', async (_, thunkAPI) => {
  const { dispatch, rejectWithValue } = thunkAPI

  return handlerTryCatchThunk(thunkAPI, async () => {
    const response = await authAPI.logOut()
    if (response.data.resultCode !== ResultCodes.OK) {
      handleServerAppError(response.data, dispatch)
      return rejectWithValue(null)
    } else {
      dispatch(todolistsAction.cleanStateData())
      return { userLogin: null }
    }
  })
})

export const authReducer = slice.reducer
export const authThunk = { checkIsAuth, logOut, logIn }
