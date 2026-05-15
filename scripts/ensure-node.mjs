/**
 * Next.js 15는 Node 18.18+ 가 필요합니다.
 * 이 스크립트는 dev 서버 실행 전에 버전을 검사합니다.
 */
const m = /^v(\d+)\.(\d+)\./.exec(process.version);
const major = m ? Number(m[1]) : 0;
const minor = m ? Number(m[2]) : 0;

const ok = major > 18 || (major === 18 && minor >= 18) || major >= 20;

if (!ok) {
  console.error('\n[x] Node.js 버전이 부족합니다.');
  console.error(`    현재: ${process.version}`);
  console.error('    필요: ^18.18.0 || ^19.8.0 || >= 20.0.0 (Next.js 15)\n');
  console.error('권장: Node.js 20 LTS 설치 후 다시 실행하세요.');
  console.error('  - https://nodejs.org/ 에서 LTS 설치');
  console.error('  - 또는 nvm-windows: nvm install 20 && nvm use 20');
  console.error('  - 이 프로젝트 루트에 .nvmrc 가 있으면: nvm use\n');
  process.exit(1);
}
