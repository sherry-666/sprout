import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  en: {
    translation: {
      nav: {
        dashboard: "Dashboard",
        dayCares: "Day Cares",
        classes: "Classes",
        users: "Users",
        settings: "Settings",
        signOut: "Sign Out"
      },
      roles: {
        systemAdmin: "System Admin",
        schoolAdmin: "School Admin",
        educator: "Educator",
        parent: "Parent"
      },
      auth: {
        login: "Log in to Sprout",
        subtitle: "Welcome back! Please enter your details.",
        usernameOrEmail: "Username or Email",
        password: "Password",
        signIn: "Sign In",
        signingIn: "Signing in...",
        invalidCredentials: "Invalid credentials"
      },
      dashboard: {
        systemOverview: "System Overview",
        managingDayCares: "Managing {{count}} day care on the Sprout platform.",
        managingDayCares_plural: "Managing {{count}} day cares on the Sprout platform.",
        totalDayCares: "Total Day Cares",
        totalKidsEnrolled: "Total Kids Enrolled",
        activeDayCares: "Active Day Cares",
        activeClasses: "Active Classes",
        educatorCount: "Educator Count",
        pendingInvites: "Pending Invites"
      },
      institutions: {
        dayCareManagement: "Day Care Management",
        onboardSubtext: "Onboard and manage day care centers on the Sprout platform.",
        addDayCare: "Add Day Care",
        noDayCaresAdded: "No day cares added yet",
        clickToAdd: 'Click "Add Day Care" to onboard your first school.',
        loading: "Loading day cares...",
        failedToLoad: "Failed to load day cares: {{error}}",
        addTitle: "Add Day Care",
        addSubtitle: "Register a new day care on the Sprout platform.",
        cancel: "Cancel",
        createDayCare: "Create Day Care",
        creating: "Creating...",
        name: "Day Care Name *",
        namePlaceholder: "e.g. Sunrise Early Learning Center",
        email: "Contact Email",
        emailPlaceholder: "e.g. contact@sunrise.com",
        phone: "Phone Number",
        phonePlaceholder: "e.g. 416-555-1234",
        address: "Street Address",
        addressPlaceholder: "e.g. 123 Main St",
        city: "City",
        cityPlaceholder: "e.g. Toronto",
        province: "Province / State",
        provincePlaceholder: "e.g. ON",
        active: "active",
        inactive: "inactive"
      },
      classes: {
        classManagement: "Class Management",
        viewAndManage: "View and manage classes and student assignments.",
        addClass: "Add Class",
        noClasses: "No classes created yet",
        clickToAdd: 'Click "Add Class" to create your first class.'
      },
      users: {
        userManagement: "User Management",
        manageEducators: "Manage educators and parents in your day care.",
        inviteUser: "Invite User",
        noUsers: "No users invited yet",
        clickToInvite: 'Click "Invite User" to send an invitation link.'
      },
      settings: {
        title: "Settings",
        subtitle: "Manage your account and app preferences.",
        language: "Language",
        languageDescription: "Select your preferred language for the Sprout interface."
      },
      schoolAdmin: {
        greeting: "Good morning, {{name}}!",
        subtitle: "Here's what's happening at your day care today.",
        totalKids: "Total Kids",
        activeClasses: "Active Classes",
        teachers: "Teachers",
        createClass: "Create Class"
      }
    }
  },
  zh: {
    translation: {
      nav: {
        dashboard: "仪表盘",
        dayCares: "日托中心",
        classes: "班级",
        users: "用户",
        settings: "设置",
        signOut: "退出登录"
      },
      roles: {
        systemAdmin: "系统管理员",
        schoolAdmin: "学校管理员",
        educator: "幼教老师",
        parent: "家长"
      },
      auth: {
        login: "登录 Sprout",
        subtitle: "欢迎回来！请输入您的详细信息。",
        usernameOrEmail: "用户名或电子邮件",
        password: "密码",
        signIn: "登录",
        signingIn: "登录中...",
        invalidCredentials: "凭据无效"
      },
      dashboard: {
        systemOverview: "系统总览",
        managingDayCares: "正在 Sprout 平台上管理 {{count}} 家日托中心。",
        managingDayCares_plural: "正在 Sprout 平台上管理 {{count}} 家日托中心。",
        totalDayCares: "日托中心总数",
        totalKidsEnrolled: "注册儿童总数",
        activeDayCares: "活跃日托中心",
        activeClasses: "活跃班级",
        educatorCount: "教师数量",
        pendingInvites: "待处理邀请"
      },
      institutions: {
        dayCareManagement: "日托中心管理",
        onboardSubtext: "在 Sprout 平台上引入和管理日托中心。",
        addDayCare: "添加日托中心",
        noDayCaresAdded: "暂未添加日托中心",
        clickToAdd: '点击"添加日托中心"引入您的第一所学校。',
        loading: "正在加载日托中心...",
        failedToLoad: "加载日托中心失败: {{error}}",
        addTitle: "添加日托中心",
        addSubtitle: "在 Sprout 平台上注册新的日托中心。",
        cancel: "取消",
        createDayCare: "创建日托中心",
        creating: "创建中...",
        name: "日托中心名称 *",
        namePlaceholder: "例如：向日葵早教中心",
        email: "联系邮箱",
        emailPlaceholder: "例如：contact@sunrise.com",
        phone: "联系电话",
        phonePlaceholder: "例如：416-555-1234",
        address: "街道地址",
        addressPlaceholder: "例如：123 Main St",
        city: "城市",
        cityPlaceholder: "例如：多伦多",
        province: "省份 / 州",
        provincePlaceholder: "例如：安大略",
        active: "活跃",
        inactive: "非活跃"
      },
      classes: {
        classManagement: "班级管理",
        viewAndManage: "查看和管理班级及学生分配。",
        addClass: "添加班级",
        noClasses: "暂未创建班级",
        clickToAdd: '点击"添加班级"创建您的第一个班级。'
      },
      users: {
        userManagement: "用户管理",
        manageEducators: "管理您日托中心的教师和家长。",
        inviteUser: "邀请用户",
        noUsers: "暂未邀请用户",
        clickToInvite: '点击"邀请用户"发送邀请链接。'
      },
      settings: {
        title: "设置",
        subtitle: "管理您的账户和应用程序偏好设置。",
        language: "语言",
        languageDescription: "选择您偏好的 Sprout 界面语言。"
      },
      schoolAdmin: {
        greeting: "早上好，{{name}}！",
        subtitle: "这是今天日托中心的动态。",
        totalKids: "儿童总数",
        activeClasses: "活跃班级",
        teachers: "教师",
        createClass: "创建班级"
      }
    }
  },
  fr: {
    translation: {
      nav: {
        dashboard: "Tableau de bord",
        dayCares: "Garderies",
        classes: "Classes",
        users: "Utilisateurs",
        settings: "Paramètres",
        signOut: "Se déconnecter"
      },
      roles: {
        systemAdmin: "Administrateur système",
        schoolAdmin: "Administrateur d'école",
        educator: "Éducateur",
        parent: "Parent"
      },
      auth: {
        login: "Connectez-vous à Sprout",
        subtitle: "Bon retour ! Veuillez entrer vos coordonnées.",
        usernameOrEmail: "Nom d'utilisateur ou Email",
        password: "Mot de passe",
        signIn: "Se connecter",
        signingIn: "Connexion...",
        invalidCredentials: "Identifiants invalides"
      },
      dashboard: {
        systemOverview: "Aperçu du système",
        managingDayCares: "Gestion de {{count}} garderie sur la plateforme Sprout.",
        managingDayCares_plural: "Gestion de {{count}} garderies sur la plateforme Sprout.",
        totalDayCares: "Garderies totales",
        totalKidsEnrolled: "Total d'enfants inscrits",
        activeDayCares: "Garderies actives",
        activeClasses: "Classes actives",
        educatorCount: "Nombre d'éducateurs",
        pendingInvites: "Invitations en attente"
      },
      institutions: {
        dayCareManagement: "Gestion des garderies",
        onboardSubtext: "Intégrer et gérer les garderies sur la plateforme Sprout.",
        addDayCare: "Ajouter une garderie",
        noDayCaresAdded: "Aucune garderie ajoutée",
        clickToAdd: 'Cliquez sur "Ajouter une garderie" pour intégrer votre première école.',
        loading: "Chargement des garderies...",
        failedToLoad: "Échec du chargement des garderies: {{error}}",
        addTitle: "Ajouter une garderie",
        addSubtitle: "Enregistrer une nouvelle garderie sur la plateforme Sprout.",
        cancel: "Annuler",
        createDayCare: "Créer une garderie",
        creating: "Création...",
        name: "Nom de la garderie *",
        namePlaceholder: "ex: Centre d'apprentissage Sunrise",
        email: "Email de contact",
        emailPlaceholder: "ex: contact@sunrise.com",
        phone: "Numéro de téléphone",
        phonePlaceholder: "ex: 416-555-1234",
        address: "Adresse",
        addressPlaceholder: "ex: 123 rue Principale",
        city: "Ville",
        cityPlaceholder: "ex: Toronto",
        province: "Province / État",
        provincePlaceholder: "ex: ON",
        active: "actif",
        inactive: "inactif"
      },
      classes: {
        classManagement: "Gestion des classes",
        viewAndManage: "Voir et gérer les classes et les affectations des étudiants.",
        addClass: "Ajouter une classe",
        noClasses: "Aucune classe créée",
        clickToAdd: 'Cliquez sur "Ajouter une classe" pour créer votre première classe.'
      },
      users: {
        userManagement: "Gestion des utilisateurs",
        manageEducators: "Gérez les éducateurs et les parents dans votre garderie.",
        inviteUser: "Inviter un utilisateur",
        noUsers: "Aucun utilisateur invité",
        clickToInvite: 'Cliquez sur "Inviter un utilisateur" pour envoyer un lien.'
      },
      settings: {
        title: "Paramètres",
        subtitle: "Gérez votre compte et vos préférences d'application.",
        language: "Langue",
        languageDescription: "Sélectionnez votre langue préférée pour l'interface Sprout."
      },
      schoolAdmin: {
        greeting: "Bonjour, {{name}} !",
        subtitle: "Voici ce qui se passe dans votre garderie aujourd'hui.",
        totalKids: "Total d'enfants",
        activeClasses: "Classes actives",
        teachers: "Éducateurs",
        createClass: "Créer une classe"
      }
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false // React already escapes values to prevent XSS
    }
  });

export default i18n;
