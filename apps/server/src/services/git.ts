import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { type SimpleGit, simpleGit } from 'simple-git';

export type GitConfig = {
  userEmail?: string;
  userName?: string;
  remoteUrl?: string;
};

export class GitService {
  private git: SimpleGit;
  private readonly dataDir: string;
  private initialized = false;

  constructor(dataDir = '/data') {
    this.dataDir = dataDir;
    // Don't initialize simpleGit until we know the directory exists
    this.git = null as unknown as SimpleGit; // Will be set in initialize()
  }

  async initialize(config?: GitConfig): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Ensure data directory exists
    try {
      await fs.access(this.dataDir);
    } catch {
      await fs.mkdir(this.dataDir, { recursive: true });
    }

    // Now initialize Git after directory exists
    this.git = simpleGit(this.dataDir);

    const isRepo = await this.isGitRepository();

    if (!isRepo) {
      await this.initializeRepository(config);
    }

    await this.ensureGitLFS();
    await this.configureGitSettings(config);
    this.initialized = true;
  }

  private async isGitRepository(): Promise<boolean> {
    try {
      // Check if .git directory exists in the data directory specifically
      const gitDir = join(this.dataDir, '.git');
      await fs.access(gitDir);

      // Also verify Git status works
      await this.git.status();
      return true;
    } catch {
      return false;
    }
  }

  private async initializeRepository(_config?: GitConfig): Promise<void> {
    // Initialize git repository in the data directory (completely separate from main project)
    console.log(`Initializing Git repository in: ${this.dataDir}`);
    await this.git.init();

    // Create initial .gitattributes for LFS
    const gitattributes = `# Git LFS tracking for 3D model files
*.stl filter=lfs diff=lfs merge=lfs -text
*.STL filter=lfs diff=lfs merge=lfs -text
*.obj filter=lfs diff=lfs merge=lfs -text
*.OBJ filter=lfs diff=lfs merge=lfs -text
*.3mf filter=lfs diff=lfs merge=lfs -text
*.3MF filter=lfs diff=lfs merge=lfs -text
*.ply filter=lfs diff=lfs merge=lfs -text
*.PLY filter=lfs diff=lfs merge=lfs -text

# Track thumbnails normally (small images)
thumbnail.png -filter
thumbnail.jpg -filter
`;

    await fs.writeFile(join(this.dataDir, '.gitattributes'), gitattributes);

    // Create .gitignore
    const gitignore = `# System files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# Temporary files
*.tmp
*.temp
*~

# Editor files
.vscode/
.idea/
*.swp
*.swo

# OS generated files
Icon?
`;

    await fs.writeFile(join(this.dataDir, '.gitignore'), gitignore);

    // Initial commit
    await this.git.add('.gitattributes');
    await this.git.add('.gitignore');
    await this.git.commit('Initial commit: Setup Git LFS and ignore rules');
  }

  private async ensureGitLFS(): Promise<void> {
    try {
      // Check if Git LFS is available
      await this.git.raw(['lfs', 'version']);

      // Install LFS hooks if not already done
      await this.git.raw(['lfs', 'install', '--local']);
      console.log('Git LFS is available and configured');
    } catch (error) {
      const errorMessage = `Git LFS is required but not installed. Please install Git LFS:
      
macOS: brew install git-lfs
Ubuntu/Debian: sudo apt install git-lfs
CentOS/RHEL: sudo yum install git-lfs
Windows: Download from https://git-lfs.github.io/

After installation, run: git lfs install

Error: ${error instanceof Error ? error.message : 'Unknown error'}`;

      console.error(errorMessage);
      throw new Error(
        'Git LFS is required but not available. Please install Git LFS and restart the server.'
      );
    }
  }

  private async configureGitSettings(config?: GitConfig): Promise<void> {
    if (config?.userName) {
      await this.git.addConfig('user.name', config.userName);
    } else {
      // Set default if not configured
      try {
        await this.git.getConfig('user.name');
      } catch {
        await this.git.addConfig('user.name', 'STL Shelf');
      }
    }

    if (config?.userEmail) {
      await this.git.addConfig('user.email', config.userEmail);
    } else {
      // Set default if not configured
      try {
        await this.git.getConfig('user.email');
      } catch {
        await this.git.addConfig('user.email', 'stl-shelf@localhost');
      }
    }

    // Configure remote if provided
    if (config?.remoteUrl) {
      await this.addRemote('origin', config.remoteUrl);
    }
  }

  async addRemote(name: string, url: string): Promise<void> {
    try {
      // Remove existing remote if it exists
      await this.git.removeRemote(name);
    } catch {
      // Remote doesn't exist, continue
    }

    await this.git.addRemote(name, url);
  }

  async commitModelUpload(
    modelId: string,
    version: string,
    message?: string
  ): Promise<string> {
    if (!this.initialized) {
      throw new Error('Git service not initialized');
    }

    const modelPath = join(modelId, version);
    const commitMessage = message || `Add ${modelId} ${version}`;

    console.log(
      `Git: Adding model files at ${modelPath} in repository ${this.dataDir}`
    );

    // Add all files in the model version directory
    await this.git.add(modelPath);

    // Also add the model's base meta.json if it exists
    const modelMetaPath = join(modelId, 'meta.json');
    try {
      await fs.access(join(this.dataDir, modelMetaPath));
      await this.git.add(modelMetaPath);
    } catch {
      // No base meta.json, that's ok
    }

    // Create commit
    const commit = await this.git.commit(commitMessage);
    return commit.commit;
  }

  async commitModelUpdate(modelId: string, message?: string): Promise<string> {
    if (!this.initialized) {
      throw new Error('Git service not initialized');
    }

    const commitMessage = message || `Update ${modelId}`;
    // Add all changes in the model directory
    await this.git.add(`${modelId}/*`);

    const commit = await this.git.commit(commitMessage);
    return commit.commit;
  }

  async commitModelDeletion(
    modelId: string,
    message?: string
  ): Promise<string> {
    if (!this.initialized) {
      throw new Error('Git service not initialized');
    }

    const commitMessage = message || `Delete ${modelId}`;
    // Remove the model directory from git
    await this.git.rm(['-r', modelId]);

    const commit = await this.git.commit(commitMessage);
    return commit.commit;
  }

  async getModelHistory(
    modelId: string,
    limit = 10
  ): Promise<
    Array<{
      hash: string;
      date: string;
      message: string;
      author_name: string;
      author_email: string;
    }>
  > {
    if (!this.initialized) {
      throw new Error('Git service not initialized');
    }

    try {
      const log = await this.git.log({
        file: modelId,
        maxCount: limit,
        format: {
          hash: '%H',
          date: '%ai',
          message: '%s',
          author_name: '%an',
          author_email: '%ae',
        },
      });

      return log.all;
    } catch (_error) {
      return [];
    }
  }

  async getRepositoryStatus(): Promise<{
    isClean: boolean;
    staged: string[];
    modified: string[];
    untracked: string[];
  }> {
    if (!this.initialized) {
      throw new Error('Git service not initialized');
    }
    const status = await this.git.status();

    return {
      isClean: status.isClean(),
      staged: status.staged,
      modified: status.modified,
      untracked: status.not_added,
    };
  }

  async pushToRemote(remoteName = 'origin', branch = 'main'): Promise<void> {
    if (!this.initialized) {
      throw new Error('Git service not initialized');
    }
    await this.git.push(remoteName, branch);
  }

  async pullFromRemote(remoteName = 'origin', branch = 'main'): Promise<void> {
    if (!this.initialized) {
      throw new Error('Git service not initialized');
    }
    await this.git.pull(remoteName, branch);
  }

  async checkRemoteConnection(remoteName = 'origin'): Promise<boolean> {
    if (!this.initialized) {
      return false;
    }

    try {
      await this.git.raw(['ls-remote', remoteName]);
      return true;
    } catch {
      return false;
    }
  }

  async getRemotes(): Promise<Array<{ name: string; url: string }>> {
    if (!this.initialized) {
      return [];
    }

    try {
      const remotes = await this.git.getRemotes(true);
      return remotes.map((remote) => ({
        name: remote.name,
        url: remote.refs.fetch || remote.refs.push || '',
      }));
    } catch (_error) {
      return [];
    }
  }

  async createBranch(branchName: string, checkout = true): Promise<void> {
    if (!this.initialized) {
      throw new Error('Git service not initialized');
    }
    if (checkout) {
      await this.git.checkoutLocalBranch(branchName);
    } else {
      await this.git.branch([branchName]);
    }
  }

  async getCurrentBranch(): Promise<string> {
    if (!this.initialized) {
      throw new Error('Git service not initialized');
    }

    try {
      const status = await this.git.status();
      return status.current || 'main';
    } catch (_error) {
      return 'main';
    }
  }
}
