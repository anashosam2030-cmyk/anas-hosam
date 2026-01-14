
export type Role = 'ADMIN' | 'USER';
export type GameDuration = 'short' | 'long';

export interface User {
  email: string;
  loginMethod: 'EMAIL' | 'GOOGLE';
  role: Role;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  image?: string;
  timestamp: number;
}

export interface TeamMember {
  email: string;
  hasSubmitted: boolean;
  proofImage?: string;
}

export interface TeamTask {
  id: string;
  title: string;
  description: string;
  totalReward: number; // For games, this acts as the reward per person
  members: TeamMember[];
  creatorEmail: string;
  isDistributed: boolean;
  duration: GameDuration;
}

export interface UserStats {
  coins: number;
  tasksCompleted: number;
  playerName: string;
  appName: string;
  language: 'EN' | 'AR';
  theme: 'Light' | 'Dark';
  soundEnabled: boolean;
  currentUser: User | null;
}

export enum TaskCost {
  STANDARD = 5
}

export const TRANSLATIONS = {
  EN: {
    title: "NEURAL",
    subtitle: "QUEST",
    verified: "Verified",
    credits: "Neural Credits",
    getMission: "Get New Mission",
    missionLog: "Mission Log",
    verifiedLogs: "Verified Logs",
    insufficient: "Insufficient Credits!",
    settings: "Settings",
    playerName: "Player Name",
    appName: "App Name",
    language: "Language",
    theme: "Theme",
    sound: "Sound",
    save: "Save",
    recharge: "Recharge Neural Credits",
    rechargeDesc: "Fuel your real-world neural expeditions.",
    processing: "Processing...",
    analysis: "Neural Analysis...",
    analysisDesc: "Gemini is scanning your proof for temporal validity.",
    proof: "Submit Proof",
    cost: "Submission cost",
    noLogs: "NO MISSION LOGS FOUND",
    completed: "Completed",
    bestValue: "Best Value",
    login: "Initialize Neural Link",
    loginDesc: "Enter your credentials to synchronize with the quest network.",
    emailLabel: "Neural ID (Email)",
    googleLogin: "Sync with Google",
    emailLogin: "Connect with ID",
    adminPanel: "Admin Panel",
    addCredits: "Inject Credits",
    injectDesc: "Directly modify neural credit balance.",
    roleBadge: "Access Level",
    teamMissions: "Game Missions",
    createTeamMission: "Create Game",
    teamReward: "Reward per Hero",
    addMember: "Add Squad Member",
    distribute: "Claim Rewards",
    waitingProof: "Syncing Data",
    submitted: "Synced",
    members: "Squad",
    gameDuration: "Duration",
    shortGame: "Short Game",
    longGame: "Long Game",
    motivations: [
      "Amazing job! Keep going!",
      "You're unstoppable!",
      "Credits rain for you!",
      "Epic performance, Hero!",
      "Data synchronized perfectly!"
    ]
  },
  AR: {
    title: "نيرول",
    subtitle: "كويست",
    verified: "تم التحقق",
    credits: "عملات عصبية",
    getMission: "مهمة جديدة",
    missionLog: "سجل المهام",
    verifiedLogs: "المهام المنجزة",
    insufficient: "لا توجد عملات كافية!",
    settings: "الإعدادات",
    playerName: "اسم اللاعب",
    appName: "اسم البرنامج",
    language: "اللغة",
    theme: "الثيم",
    sound: "الصوت",
    save: "حفظ",
    recharge: "شحن العملات",
    rechargeDesc: "اشحن طاقتك للقيام برحلاتك العصبية في العالم الحقيقي.",
    processing: "جاري المعالجة...",
    analysis: "التحليل العصبي...",
    analysisDesc: "جيمناي يقوم بفحص إثباتك للتأكد من صحته.",
    proof: "إرسال الإثبات",
    cost: "تكلفة المهمة",
    noLogs: "لم يتم العثور على سجلات",
    completed: "مكتمل",
    bestValue: "الأفضل قيمة",
    login: "بدء الارتباط العصبي",
    loginDesc: "أدخل بياناتك للمزامنة مع شبكة المهام.",
    emailLabel: "الهوية العصبية (البريد)",
    googleLogin: "مزامنة مع جوجل",
    emailLogin: "الاتصال بالهوية",
    adminPanel: "لوحة التحكم",
    addCredits: "حقن عملات",
    injectDesc: "تعديل رصيد العملات العصبية مباشرة.",
    roleBadge: "مستوى الوصول",
    teamMissions: "مهام اللعب",
    createTeamMission: "إنشاء لعبة",
    teamReward: "المكافأة لكل بطل",
    addMember: "إضافة عضو فريق",
    distribute: "استلام المكافآت",
    waitingProof: "جاري المزامنة",
    submitted: "تم المزامنة",
    members: "الفريق",
    gameDuration: "مدة اللعبة",
    shortGame: "لعبة قصيرة",
    longGame: "لعبة طويلة",
    motivations: [
      "عمل رائع! استمر!",
      "أنت لا يمكن إيقافك!",
      "العملات تتساقط لك!",
      "أداء أسطوري يا بطل!",
      "تم مزامنة البيانات بنجاح!"
    ]
  }
};
