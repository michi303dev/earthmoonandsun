(() => {
  'use strict';

  const canvas = document.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  const YEAR = 6;
  const MONTH = YEAR * 27.3 / 365.25;
  const MOON_TRAIL_DURATION = MONTH * 3;
  const TAU = Math.PI * 2;
  // Fixed simulation samples keep the fast lunar curve smooth on slower screens.
  const STEP = 1 / 240;
  const earthTrail = [];
  const moonTrail = [];
  let width, height, diameter, earthRadius, moonRadius;
  let time = 0;
  let previousTimestamp = null;
  let sampledTime = 0;

  function position(t) {
    const earthAngle = TAU * t / YEAR - Math.PI / 2;
    const moonAngle = TAU * t / MONTH - Math.PI / 2;
    const earth = {
      x: width / 2 + earthRadius * Math.cos(earthAngle),
      y: height / 2 + earthRadius * Math.sin(earthAngle)
    };
    return {
      earth,
      moon: {
        x: earth.x + moonRadius * Math.cos(moonAngle),
        y: earth.y + moonRadius * Math.sin(moonAngle)
      }
    };
  }

  function record(t) {
    const p = position(t);
    earthTrail.push({ ...p.earth, t });
    moonTrail.push({ ...p.moon, t });
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const size = Math.min(width, height);
    diameter = Math.max(3, size / 256);
    // The complete envelope, including the circle and stroke, stays inside.
    const envelope = Math.max(0, size * 0.40 - diameter * 4);
    earthRadius = envelope * 0.76;
    moonRadius = envelope * 0.24;
    // Old pixels belong to the old layout; restart histories on resize.
    earthTrail.length = 0;
    moonTrail.length = 0;
    sampledTime = time;
    record(time);
  }

  function trim(trail, duration) {
    while (trail.length && trail[0].t < time - duration) trail.shift();
  }

  function drawTrail(trail, current, duration, color) {
    ctx.lineWidth = diameter * 2;
    ctx.lineCap = 'round';
    // Include the current sub-step position without storing uneven samples.
    for (let i = 1; i <= trail.length; i++) {
      const a = trail[i - 1];
      const b = i < trail.length ? trail[i] : { ...current, t: time };
      const alpha = Math.max(0, 1 - (time - (a.t + b.t) / 2) / duration);
      ctx.strokeStyle = `rgba(${color}, ${alpha * 0.85})`;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
  }

  function drawBody(x, y, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, diameter * 4, 0, TAU);
    ctx.fill();
  }

  function frame(timestamp) {
    if (previousTimestamp !== null) time += (timestamp - previousTimestamp) / 1000;
    previousTimestamp = timestamp;
    // Skip expired history after an unusually long frame without a catch-up loop.
    sampledTime = Math.max(sampledTime, time - YEAR - STEP);
    while (sampledTime + STEP <= time) {
      sampledTime += STEP;
      record(sampledTime);
    }
    trim(earthTrail, YEAR);
    trim(moonTrail, MOON_TRAIL_DURATION);
    const p = position(time);
    ctx.clearRect(0, 0, width, height);
    drawTrail(earthTrail, p.earth, YEAR, '105,182,247');
    drawTrail(moonTrail, p.moon, MOON_TRAIL_DURATION, '231,237,247');
    drawBody(width / 2, height / 2, '#f4c879');
    drawBody(p.earth.x, p.earth.y, '#69b6f7');
    drawBody(p.moon.x, p.moon.y, '#e7edf7');
    requestAnimationFrame(frame);
  }

  // Hidden tabs pause artwork time, avoiding a jump when returning to the page.
  document.addEventListener('visibilitychange', () => { previousTimestamp = null; });
  new ResizeObserver(resize).observe(canvas);
  resize();
  requestAnimationFrame(frame);
})();
