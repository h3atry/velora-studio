import os from 'os';

let lastCpu = process.cpuUsage();
let lastTime = Date.now();

export function getSystemStats(): { cpu: number; memory: number } {
  const now = Date.now();
  const elapsed = now - lastTime || 1;
  const cpu = process.cpuUsage(lastCpu);
  const totalMicro = (cpu.user + cpu.system) / 1000;
  const cpuPercent = Math.min(100, (totalMicro / elapsed) * 100 / os.cpus().length);
  lastCpu = process.cpuUsage();
  lastTime = now;

  const mem = process.memoryUsage();
  const memoryPercent = (mem.rss / os.totalmem()) * 100;

  return {
    cpu: Math.round(cpuPercent * 100) / 100,
    memory: Math.round(memoryPercent * 100) / 100,
  };
}
