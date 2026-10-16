import { canvasGame, clamp, label } from './util.js';

const W = 480, H = 480;
const PW = 10, PH = 72, PX = 20, AX = W - 20 - PW;
const BR = 7, PSPEED = 7, AI_SPEED = 4.3, LOSE_AT = 3, MAX_VX = 11, MAX_VY = 8;

const serve = (dir) => ({ x: W / 2, y: H / 2, vx: 4.5 * dir, vy: (Math.random() * 2 - 1) * 3 });

export default {
  id: 'pong',
  title: '퐁',
  category: '클래식',
  tagline: 'AI 와 1:1 탁구',
  blurb: '최초의 아케이드 게임. AI 가 3점을 내기 전에 최대한 많이 득점하자.',
  better: 'high',
  unit: '점',
  glyph: '◫',
  accent: '#eef0f8',
  howto: '마우스·터치로 왼쪽 패들 이동, ↑↓ 도 가능',
  mount: (el, api) => canvasGame(el, api, {
    w: W, h: H, bg: '#0a0c12',
    intro: { title: '퐁', text: `AI 가 ${LOSE_AT}점을 내면 끝. 패들 끝으로 받으면 각도가 커진다.`, button: '시작' },
    reset: () => ({ py: H / 2, ay: H / 2, ptrSeen: null, ball: serve(1), me: 0, ai: 0, wait: 60 }),
    hud: (s) => `나 ${s.me} : ${s.ai} AI`,
    score: (s) => s.me,
    over: (s) => ({ title: 'AI 승리', text: `${s.me}점 획득`, button: '다시 하기' }),
    step(s, inp) {
      if (inp.pointer && inp.pointer !== s.ptrSeen) { s.ptrSeen = inp.pointer; s.py = inp.pointer.y; }
      if (inp.held.has('up')) s.py -= PSPEED;
      if (inp.held.has('down')) s.py += PSPEED;
      s.py = clamp(s.py, PH / 2, H - PH / 2);
      const b = s.ball;
      const aim = b.vx > 0 ? b.y : H / 2;
      s.ay = clamp(s.ay + clamp(aim - s.ay, -AI_SPEED, AI_SPEED), PH / 2, H - PH / 2);
      if (s.wait > 0) { s.wait--; return false; }

      b.x += b.vx;
      b.y += b.vy;
      if (b.y < BR || b.y > H - BR) { b.vy = -b.vy; b.y = clamp(b.y, BR, H - BR); }
      const hit = (padY) => {
        b.vx = clamp(-b.vx * 1.06, -MAX_VX, MAX_VX);
        b.vy = clamp(b.vy + ((b.y - padY) / (PH / 2)) * 3, -MAX_VY, MAX_VY);
      };
      if (b.vx < 0 && b.x - BR <= PX + PW && b.x > PX - 4 && Math.abs(b.y - s.py) <= PH / 2 + BR) { b.x = PX + PW + BR; hit(s.py); }
      if (b.vx > 0 && b.x + BR >= AX && b.x < AX + PW + 4 && Math.abs(b.y - s.ay) <= PH / 2 + BR) { b.x = AX - BR; hit(s.ay); }
      if (b.x < -BR) {
        s.ai++;
        if (s.ai >= LOSE_AT) return true;
        s.ball = serve(1);
        s.wait = 45;
      }
      if (b.x > W + BR) { s.me++; s.ball = serve(-1); s.wait = 45; }
      return false;
    },
    draw(ctx, s) {
      ctx.fillStyle = '#0a0c12';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      for (let y = 8; y < H; y += 24) ctx.fillRect(W / 2 - 2, y, 4, 12);
      label(ctx, String(s.me), W / 2 - 60, 50, { size: 44, color: 'rgba(255,255,255,0.25)' });
      label(ctx, String(s.ai), W / 2 + 60, 50, { size: 44, color: 'rgba(255,255,255,0.25)' });
      ctx.fillStyle = '#7cf3ff';
      ctx.fillRect(PX, s.py - PH / 2, PW, PH);
      ctx.fillStyle = '#ff5c8a';
      ctx.fillRect(AX, s.ay - PH / 2, PW, PH);
      ctx.fillStyle = '#eef0f8';
      ctx.beginPath();
      ctx.arc(s.ball.x, s.ball.y, BR, 0, Math.PI * 2);
      ctx.fill();
    },
  }),
};
