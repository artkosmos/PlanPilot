import {AddTodolistACType, GetTodolistACType, RemoveToDoListACType, setTodolistStatusAC} from "./todolists-reducer";
import {
  PropertiesToUpdateType,
  ResponseType,
  ResultCodes,
  TaskType,
  todolistAPI,
  UpdateTaskModelType
} from "../api/todolist-api";
import {Dispatch} from "redux";
import {StateType} from "../store/store";
import {setPreloaderStatusAC} from "./app-reducer";
import {handleServerAppError, handleServerNetworkError} from "../utils/error-utils";
import axios from "axios";

type ActionTasksTypes =
  AddTaskACType
  | RemoveTaskACType
  | AddTodolistACType
  | RemoveToDoListACType
  | ChangeTaskACType
  | GetTodolistACType
  | GetTasksACType

export type TasksStateType = {
  [key: string]: TaskType[]
}

const initialState: TasksStateType = {}

export const TaskReducer = (state = initialState, action: ActionTasksTypes): TasksStateType => {
  switch (action.type) {
    case 'ADD-TASK':
      return {...state, [action.payload.todolistID]: [action.payload.task, ...state[action.payload.todolistID]]}
    case "REMOVE-TASK":
      return {
        ...state, [action.payload.todolistID]: state[action.payload.todolistID]
          .filter((item => item.id !== action.payload.taskID))
      }
    case "UPDATE-TASK":
      return {
        ...state, [action.payload.todolistId]: state[action.payload.todolistId]
          .map(element => element.id === action.payload.taskId
            ? {...element, ...action.payload.model}
            : element)
      }
    case "ADD-TODOLIST":
      return {...state, [action.payload.todolist.id]: []}
    case "REMOVE-TODOLIST":
      let {[action.payload.todolistId]: [], ...rest} = state
      return rest
    case "GET-TODOLISTS":
      const copyState = {...state}
      action.payload.todolists.forEach(item => {
        copyState[item.id] = []
      })
      return copyState
    case "GET-TASKS":
      return {...state, [action.payload.todolistId]: [...action.payload.tasks]}
    default:
      return state
  }
}

type AddTaskACType = ReturnType<typeof addTaskAC>
export const addTaskAC = (todolistID: string, task: TaskType) => {
  return {
    type: 'ADD-TASK',
    payload: {task, todolistID}
  } as const
}

type RemoveTaskACType = ReturnType<typeof removeTaskAC>
export const removeTaskAC = (todolistID: string, taskID: string) => {
  return {
    type: 'REMOVE-TASK',
    payload: {todolistID, taskID}
  } as const
}

type ChangeTaskACType = ReturnType<typeof changeTaskAC>
export const changeTaskAC = (todolistId: string, taskId: string, model: PropertiesToUpdateType) => {
  return {
    type: 'UPDATE-TASK',
    payload: {todolistId, taskId, model}
  } as const
}

type GetTasksACType = ReturnType<typeof getTasksAC>
export const getTasksAC = (todolistId: string, tasks: TaskType[]) => {
  return {
    type: 'GET-TASKS',
    payload: {todolistId, tasks}
  } as const
}

export const setTasksTC = (todolistId: string) => (dispatch: Dispatch) => {
  dispatch(setPreloaderStatusAC('loading'))
  todolistAPI.getTasks(todolistId)
    .then(response => {
      dispatch(getTasksAC(todolistId, response.data.items))
    })
    .catch(error => alert('Loading error >>>' + error))
    .finally(() => dispatch(setPreloaderStatusAC('succeeded')))
}

export const addTaskTC = (todolistId: string, title: string) => async (dispatch: Dispatch) => {
  dispatch(setPreloaderStatusAC('loading'))
  dispatch(setTodolistStatusAC(todolistId, 'loading'))
  try {
    const response = await todolistAPI.addTask(todolistId, title)
    if (response.data.resultCode !== ResultCodes.OK) {
      handleServerAppError<{ item: TaskType }>(response.data, dispatch)
    } else {
      dispatch(addTaskAC(todolistId, response.data.data.item))
      dispatch(setPreloaderStatusAC('succeeded'))
    }
  }
  catch (error) {
    if (axios.isAxiosError<ResponseType>(error)) {
      const errorMessage = error.response ? error.response.data.messages[0] : error.message
      handleServerNetworkError(errorMessage, dispatch)
    } else {
      const jsError = 'Code compilation error'
      handleServerNetworkError(jsError, dispatch)
    }
  }
  finally {
    dispatch(setTodolistStatusAC(todolistId, 'idle'))
  }
}

export const deleteTaskTC = (todolistId: string, taskId: string) => (dispatch: Dispatch) => {
  dispatch(setPreloaderStatusAC('loading'))
  todolistAPI.deleteTask(todolistId, taskId)
    .then(() => {
      dispatch(removeTaskAC(todolistId, taskId))
    })
    .catch(error => alert('Loading error >>>' + error))
    .finally(() => dispatch(setPreloaderStatusAC('succeeded')))
}

export const updateTaskTC = (todolistId: string, taskId: string, model: PropertiesToUpdateType) => (dispatch: Dispatch, getState: () => StateType) => {
  dispatch(setPreloaderStatusAC('loading'))

  const task = getState().tasks[todolistId].find(item => item.id === taskId)
  if (task) {
    const modelForAPI: UpdateTaskModelType = {
      title: task.title,
      deadline: task.deadline,
      description: task.description,
      priority: task.priority,
      startDate: task.startDate,
      status: task.status,
      ...model
    }

    todolistAPI.updateTask(todolistId, taskId, modelForAPI)
      .then(() => {
        dispatch(changeTaskAC(todolistId, taskId, model))
      })
      .catch(error => alert('Loading error >>>' + error))
      .finally(() => dispatch(setPreloaderStatusAC('succeeded')))
  }
}


// типизация Error в промисах then\catch
//   .catch((error: AxiosError<ResponseType>) => {
//     const errorMessage = error.response ? error.response.data.messages[0] : error.message
//     handleServerNetworkError(errorMessage, dispatch)
//   })