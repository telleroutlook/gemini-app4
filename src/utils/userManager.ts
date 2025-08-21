// 简单的用户配置系统
export interface UserProfile {
  id: string;
  name: string;
  avatar?: string;
  createdAt: Date;
  lastUsed: Date;
}

// 用户管理器
class SimpleUserManager {
  private readonly userKey = 'gemini-users';
  private readonly currentUserKey = 'current-user';

  // 获取所有用户
  getUsers(): UserProfile[] {
    try {
      const users = localStorage.getItem(this.userKey);
      return users ? JSON.parse(users) : [];
    } catch {
      return [];
    }
  }

  // 获取当前用户
  getCurrentUser(): UserProfile | null {
    try {
      const currentId = localStorage.getItem(this.currentUserKey);
      if (!currentId) return null;
      
      const users = this.getUsers();
      return users.find(u => u.id === currentId) || null;
    } catch {
      return null;
    }
  }

  // 创建新用户
  createUser(name: string): UserProfile {
    const newUser: UserProfile = {
      id: Date.now().toString(),
      name,
      createdAt: new Date(),
      lastUsed: new Date(),
    };

    const users = this.getUsers();
    users.push(newUser);
    localStorage.setItem(this.userKey, JSON.stringify(users));
    
    this.setCurrentUser(newUser.id);
    return newUser;
  }

  // 切换用户
  setCurrentUser(userId: string): void {
    const users = this.getUsers();
    const user = users.find(u => u.id === userId);
    if (user) {
      user.lastUsed = new Date();
      localStorage.setItem(this.userKey, JSON.stringify(users));
      localStorage.setItem(this.currentUserKey, userId);
    }
  }

  // 删除用户
  deleteUser(userId: string): void {
    const users = this.getUsers().filter(u => u.id !== userId);
    localStorage.setItem(this.userKey, JSON.stringify(users));
    
    // 如果删除的是当前用户，清除当前用户设置
    if (this.getCurrentUser()?.id === userId) {
      localStorage.removeItem(this.currentUserKey);
    }
  }

  // 获取默认用户或创建
  getOrCreateDefaultUser(): UserProfile {
    let currentUser = this.getCurrentUser();
    if (!currentUser) {
      const users = this.getUsers();
      if (users.length > 0) {
        currentUser = users[0];
        this.setCurrentUser(currentUser.id);
      } else {
        currentUser = this.createUser('Default User');
      }
    }
    return currentUser;
  }
}

export const userManager = new SimpleUserManager();