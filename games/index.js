import echo from './echo.js';
import snake from './snake.js';
import g2048 from './g2048.js';
import mines from './mines.js';
import breakout from './breakout.js';
import flappy from './flappy.js';
import pong from './pong.js';
import invaders from './invaders.js';
import dino from './dino.js';
import stacker from './stacker.js';
import cave from './cave.js';
import tetris from './tetris.js';
import catchGame from './catch.js';
import dodge from './dodge.js';
import doodle from './doodle.js';
import crossy from './crossy.js';
import aim from './aim.js';
import whack from './whack.js';
import reaction from './reaction.js';
import stroop from './stroop.js';
import memory from './memory.js';
import simon from './simon.js';
import lightsout from './lightsout.js';
import fifteen from './fifteen.js';
import tictactoe from './tictactoe.js';
import connect4 from './connect4.js';
import typing from './typing.js';
import math from './math.js';
import order from './order.js';
import baseball from './baseball.js';

// To add a game: write a module with the same shape and list it here.
export const GAMES = [
  echo, tetris, snake, g2048, breakout, flappy, dino, stacker, dodge, crossy,
  invaders, pong, cave, doodle, catchGame, mines, memory, fifteen, lightsout, aim,
  whack, reaction, order, stroop, simon, typing, math, baseball, tictactoe, connect4,
];
export const byId = (id) => GAMES.find((g) => g.id === id);
