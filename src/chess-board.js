import { template, emptySquare, getPieceClone } from './templates'
import { removeNodeContent } from './dom-utils'
import { getFileRank } from './chess-utils'

class ChessBoard extends HTMLElement {
  createdCallback () {
    this._board = null // keep a reference to the board table.
    this._boardRoot = this.createShadowRoot()
    this.fen = this.innerHTML.trim()

    /*
     * A stinky fugly workaround to redraw the board when created.
     *
     * (Chrome 36/38) The chessboard will not rotate with css if I do not force
     * a redraw of the component. It's difficult to reproduce a minimal example
     * for bugreports.
     */
    this.style.display = 'run-in'
    setTimeout(() => {
      this.style.display = 'block'
    }, 0)
    // end of stinky fugly workaround
  }

  attributeChangedCallback (attribute, oldVal, newVal) {
    if (attribute === 'unicode') {
      var fen = this.fen
      removeNodeContent(this._boardRoot)
      this.fen = fen // redraws
    }
  }

  /**
   * Replaces the current board with an empty one.
   */
  clearBoard () {
    var clone = template.content.cloneNode(true)
    removeNodeContent(this._boardRoot)
    this._boardRoot.appendChild(clone)
    this._board = this._boardRoot.querySelector('.chessBoard')
  }

  /**
   * Moves a piece.
   *
   * @param {string} from - The square to move from. Eg: "a2"
   * @param {string} to - The square to move to. Eg: "a3"
   */
  move (from, to) {
    const [fromFile, fromRank] = getFileRank(from)
    const fromCell = this._board.rows[fromRank].cells[fromFile]

    const [toFile, toRank] = getFileRank(to)
    const toCell = this._board.rows[toRank].cells[toFile]

    const piece = fromCell.querySelector('.piece')
    const emptyPiece = emptySquare.content.cloneNode(true)

    if (!piece) {
      throw new Error('Move Error: the from square was empty')
    }

    removeNodeContent(toCell)
    removeNodeContent(fromCell)

    toCell.appendChild(piece)
    fromCell.appendChild(emptyPiece)
  }

  /**
   * Removes the piece at the given square.
   *
   * @param {string} square - The square. Eg: "a2"
   */
  clear (square) {
    const [file, rank] = getFileRank(square)
    const boardCell = this._board.rows[rank].cells[file]

    removeNodeContent(boardCell)
  }

  /**
   * Places a piece in the given square.
   *
   * @param {string} square - The square. Eg: "a2"
   * @param {string} piece - the ascii representation of a piece. Eg: "K"
   */
  put (square, piece) {
    const [file, rank] = getFileRank(square)
    const boardCell = this._board.rows[rank].cells[file]

    removeNodeContent(boardCell)
    this._setPiece(this._board, file, rank, piece)
  }

  _setPiece (board, file, rank, piece) {
    const unicode = !!this.attributes.unicode
    const row = board.rows[rank]
    let cell = row.cells[file]

    removeNodeContent(cell)

    // some polyfill (FF 24.3)
    if (!(cell instanceof Node)) {
      cell = window.ShadowDOMPolyfill.wrap(cell)
    }

    cell.appendChild(getPieceClone(piece, unicode))
  }

  /**
   * Set the current position.
   * (appends a new board to this._rootBoard)
   *
   * @param {string} fen - a position string as FEN
   */
  set fen (fen) {
    if (!fen) return
    if (fen === 'start') fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR'

    const clone = template.content.cloneNode(true)
    let board = clone.children[1]  // TODO: need better selectors in documentFragment.
    let rank = 0
    let file = 0
    let fenIndex = 0

    let fenChar
    let count
    let i

    while (fenIndex < fen.length) {
      fenChar = fen[fenIndex]

      if (fenChar === ' ') {
        break // ignore the rest
      }
      if (fenChar === '/') {
        rank++
        file = 0
        fenIndex++
        continue
      }

      if (isNaN(parseInt(fenChar, 10))) {
        this._setPiece(board, file, rank, fenChar)
        file++
      } else {
        count = parseInt(fenChar, 10)
        for (i = 0; i < count; i++) {
          this._setPiece(board, file, rank, '')
          file++
        }
      }

      fenIndex++
    }
    removeNodeContent(this._boardRoot)
    this._boardRoot.appendChild(clone)
    this._board = this._boardRoot.querySelector('.chessBoard')
  }

  /**
   * Get the current position as FEN.
   */
  get fen () {
    let fen = []
    let i
    let j
    let count
    let cell
    let piece

    for (i = 0; i < 8; i++) {
      count = 0
      for (j = 0; j < 8; j++) {
        cell = this._board.rows[i].cells[j]
        piece = cell.querySelector('[ascii]')

        if (piece) {
          if (count > 0) {
            fen.push(count)
            count = 0
          }
          fen.push(piece.attributes.ascii.value)
        } else {
          count++
        }
      }

      if (count > 0) {
        fen.push(count)
      }
      fen.push('/')
    }
    fen.pop()
    return fen.join('')
  }
}

window.ChessBoard = document.registerElement('chess-board', ChessBoard)
