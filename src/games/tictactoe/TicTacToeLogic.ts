export type Player = 'X' | 'O'
export type CellValue = Player | null
export type Board = [
  CellValue, CellValue, CellValue,
  CellValue, CellValue, CellValue,
  CellValue, CellValue, CellValue,
]

export interface TicTacToeState {
  board: Board
  currentPlayer: Player
  winner: Player | null
  isDraw: boolean
  winningLine: [number, number, number] | null
}

const WIN_LINES: [number, number, number][] = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
  [0, 4, 8], [2, 4, 6],             // diagonals
]

export function createInitialState(): TicTacToeState {
  return {
    board: [null, null, null, null, null, null, null, null, null],
    currentPlayer: 'X',
    winner: null,
    isDraw: false,
    winningLine: null,
  }
}

export function isValidMove(state: TicTacToeState, index: number): boolean {
  return !state.winner && !state.isDraw && state.board[index] === null
}

export function applyMove(state: TicTacToeState, index: number): TicTacToeState {
  if (!isValidMove(state, index)) return state

  const board = [...state.board] as Board
  board[index] = state.currentPlayer

  const winningLine = findWinner(board)
  const winner = winningLine ? state.currentPlayer : null
  const isDraw = !winner && board.every((c) => c !== null)

  return {
    board,
    currentPlayer: state.currentPlayer === 'X' ? 'O' : 'X',
    winner,
    isDraw,
    winningLine,
  }
}

function findWinner(board: Board): [number, number, number] | null {
  for (const line of WIN_LINES) {
    const [a, b, c] = line
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return line
    }
  }
  return null
}
