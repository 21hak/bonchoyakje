import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

// 상위 디렉터리(/Users/wonhak)에 다른 package-lock.json 이 있어 Next 가 워크스페이스
// 루트를 잘못 추론하는 것을 막기 위해 루트를 이 프로젝트로 고정한다.
const projectRoot = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  turbopack: {
    root: projectRoot,
  },
};

export default nextConfig;
