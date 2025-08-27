import type { Context as HonoContext } from 'hono';
import { FileSystemService } from '../services/filesystem';
import { GitService } from '../services/git';

// Shared service instances to fix cache consistency issue
let sharedFsService: FileSystemService | null = null;
let sharedGitService: GitService | null = null;
let servicesInitialized = false;

export type CreateContextOptions = {
  context: HonoContext;
};

export async function createContext(_options: CreateContextOptions) {
  // Determine data directory
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const defaultDataDir = isDevelopment ? './data' : '/data';
  const dataDir = process.env.DATA_DIR || defaultDataDir;

  // Initialize shared services once to fix cache consistency
  if (!servicesInitialized) {
    servicesInitialized = true;
    
    // Initialize shared filesystem service
    sharedFsService = new FileSystemService(dataDir);
    await sharedFsService.initialize();
    
    // Initialize shared git service 
    sharedGitService = new GitService(dataDir);
    try {
      await sharedGitService.initialize({
        userEmail: process.env.GIT_USER_EMAIL,
        userName: process.env.GIT_USER_NAME,
        remoteUrl: process.env.GIT_REMOTE_URL,
      });
    } catch (error) {
      console.warn('Git initialization failed, continuing without Git:', error.message);
    }
  }

  return {
    session: null,
    services: {
      // Use shared service instances to fix cache consistency
      filesystem: sharedFsService!,
      git: sharedGitService!,
    },
    dataDir,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
