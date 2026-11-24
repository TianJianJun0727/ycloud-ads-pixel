import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

if (process.env.HUSKY === '0' || !existsSync('.git')) {
  process.exit(0);
}

const [gitDir, commonDir] = execFileSync(
  'git',
  ['rev-parse', '--git-dir', '--git-common-dir'],
  {
    encoding: 'utf8',
  },
)
  .trim()
  .split('\n');

if (gitDir !== commonDir) {
  execFileSync('git', [
    'config',
    '--local',
    'extensions.worktreeConfig',
    'true',
  ]);
  // Husky otherwise writes core.hooksPath to the config shared by all worktrees.
  process.env.GIT_CONFIG = resolve(gitDir, 'config.worktree');
}

const { default: installHusky } = await import('husky');
const error = installHusky();
if (error) {
  throw new Error(error.trim());
}
