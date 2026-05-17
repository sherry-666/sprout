import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  en: {
    translation: {
      nav: {
        dashboard: "Dashboard",
        dayCares: "Day Cares",
        institutions: "Institutions",
        classes: "Classes",
        users: "Users",
        settings: "Settings",
        signOut: "Sign Out"
      },
      roles: {
        systemAdmin: "System Admin",
        institutionAdmin: "Institution Admin",
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
        inviteInstitution: "Invite Institution",
        noDayCaresAdded: "No day cares added yet",
        clickToAdd: 'Click "Add Day Care" to onboard your first institution.',
        deleteTitle: "Delete Institution",
        deleteWarning: "This is a dangerous action and cannot be undone. All data associated with this institution will be permanently deleted.",
        deleteConfirmLabel: 'Type the institution name to confirm:',
        deleteConfirmPlaceholder: "Type institution name here",
        deleteButton: "Delete Institution",
        deleting: "Deleting...",
        cancelDelete: "Cancel",
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
        inactive: "inactive",
        adminSection: "Institution Administrator",
        adminSectionDesc: "An activation email will be sent to the admin to set up their account.",
        adminFirstName: "Admin First Name",
        adminFirstNamePlaceholder: "e.g. Jane",
        adminLastName: "Admin Last Name",
        adminLastNamePlaceholder: "e.g. Smith",
        adminEmail: "Admin Email",
        adminEmailPlaceholder: "e.g. jane@sunrise.com"
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
      },
      institutionDetail: {
        loading: "Loading institution...",
        notFound: "Institution not found.",
        back: "Back to Day Cares",
        details: "Institution Details",
        classes: "Classes",
        admin: "Institution Admin",
        noAdmin: "No admin assigned yet.",
        educators: "Educators",
        noEducators: "No educators added yet.",
        kids: "Kids",
        noKids: "No kids enrolled yet.",
        manage: "Manage",
        deleteHint: "Permanently remove this institution and all associated data from Sprout.",
        deleteSuccessMsg: "has been deleted. Users belonging to this institution can no longer log in.",
        done: "Done"
      },
      activate: {
        validating: "Validating your invitation...",
        welcome: "Welcome, {{name}}!",
        invitedTo: "You've been invited to manage {{institution}} on Sprout.",
        emailLabel: "Email",
        newPassword: "New Password",
        confirmPassword: "Confirm Password",
        activateButton: "Activate Account",
        activating: "Activating...",
        success: "Account activated successfully! Redirecting to login...",
        redirecting: "You will be redirected shortly.",
        invalidToken: "This invitation link is invalid or has expired.",
        passwordMismatch: "Passwords do not match.",
        passwordTooShort: "Password must be at least 6 characters.",
        failed: "Failed to activate account.",
        goToLogin: "Go to Login"
      }
    }
  },
  zh: {
    translation: {
      nav: {
        dashboard: "仪表盘",
        dayCares: "日托中心",
        institutions: "机构",
        classes: "班级",
        users: "用户",
        settings: "设置",
        signOut: "退出登录"
      },
      roles: {
        systemAdmin: "系统管理员",
        institutionAdmin: "机构管理员",
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
        inviteInstitution: "邀请机构",
        noDayCaresAdded: "暂未添加日托中心",
        clickToAdd: '点击"添加日托中心"引入您的第一个机构。',
        deleteTitle: "删除机构",
        deleteWarning: "这是一项危险操作且无法撤销。该机构的所有相关数据将被永久删除。",
        deleteConfirmLabel: "输入机构名称以确认：",
        deleteConfirmPlaceholder: "在此输入机构名称",
        deleteButton: "删除机构",
        deleting: "删除中...",
        cancelDelete: "取消",
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
        inactive: "非活跃",
        adminSection: "机构管理员",
        adminSectionDesc: "将向管理员发送激活邮件以设置其账户。",
        adminFirstName: "管理员名字",
        adminFirstNamePlaceholder: "例如：小明",
        adminLastName: "管理员姓氏",
        adminLastNamePlaceholder: "例如：张",
        adminEmail: "管理员邮箱",
        adminEmailPlaceholder: "例如：jane@sunrise.com"
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
      },
      institutionDetail: {
        loading: "正在加载机构信息...",
        notFound: "未找到该机构。",
        back: "返回日托中心",
        details: "机构详情",
        classes: "班级",
        admin: "机构管理员",
        noAdmin: "尚未分配管理员。",
        educators: "教师",
        noEducators: "尚未添加教师。",
        kids: "儿童",
        noKids: "尚未注册儿童。",
        manage: "管理",
        deleteHint: "从 Sprout 永久移除此机构及所有相关数据。",
        deleteSuccessMsg: "已被删除。该机构的用户将无法再登录。",
        done: "完成"
      },
      activate: {
        validating: "正在验证您的邀请...",
        welcome: "欢迎，{{name}}！",
        invitedTo: "您已被邀请在 Sprout 上管理 {{institution}}。",
        emailLabel: "电子邮件",
        newPassword: "新密码",
        confirmPassword: "确认密码",
        activateButton: "激活账户",
        activating: "激活中...",
        success: "账户激活成功！正在跳转到登录页面...",
        redirecting: "您将很快被重定向。",
        invalidToken: "此邀请链接无效或已过期。",
        passwordMismatch: "两次输入的密码不一致。",
        passwordTooShort: "密码至少需要6个字符。",
        failed: "账户激活失败。",
        goToLogin: "前往登录"
      }
    }
  },
  fr: {
    translation: {
      nav: {
        dashboard: "Tableau de bord",
        dayCares: "Garderies",
        institutions: "Institutions",
        classes: "Classes",
        users: "Utilisateurs",
        settings: "Paramètres",
        signOut: "Se déconnecter"
      },
      roles: {
        systemAdmin: "Administrateur système",
        institutionAdmin: "Administrateur d'institution",
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
        inviteInstitution: "Inviter une institution",
        noDayCaresAdded: "Aucune garderie ajoutée",
        clickToAdd: 'Cliquez sur "Ajouter une garderie" pour intégrer votre première institution.',
        deleteTitle: "Supprimer l'institution",
        deleteWarning: "Cette action est dangereuse et irréversible. Toutes les données associées à cette institution seront définitivement supprimées.",
        deleteConfirmLabel: "Tapez le nom de l'institution pour confirmer :",
        deleteConfirmPlaceholder: "Tapez le nom de l'institution ici",
        deleteButton: "Supprimer l'institution",
        deleting: "Suppression...",
        cancelDelete: "Annuler",
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
        inactive: "inactif",
        adminSection: "Administrateur de l'institution",
        adminSectionDesc: "Un email d'activation sera envoyé à l'administrateur pour configurer son compte.",
        adminFirstName: "Prénom de l'admin",
        adminFirstNamePlaceholder: "ex: Jeanne",
        adminLastName: "Nom de l'admin",
        adminLastNamePlaceholder: "ex: Dupont",
        adminEmail: "Email de l'admin",
        adminEmailPlaceholder: "ex: jane@sunrise.com"
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
      },
      institutionDetail: {
        loading: "Chargement de l'institution...",
        notFound: "Institution introuvable.",
        back: "Retour aux garderies",
        details: "Détails de l'institution",
        classes: "Classes",
        admin: "Administrateur de l'institution",
        noAdmin: "Aucun administrateur assigné.",
        educators: "Éducateurs",
        noEducators: "Aucun éducateur ajouté.",
        kids: "Enfants",
        noKids: "Aucun enfant inscrit.",
        manage: "Gérer",
        deleteHint: "Supprimer définitivement cette institution et toutes les données associées de Sprout.",
        deleteSuccessMsg: "a été supprimé(e). Les utilisateurs de cette institution ne peuvent plus se connecter.",
        done: "Terminé"
      },
      activate: {
        validating: "Validation de votre invitation...",
        welcome: "Bienvenue, {{name}} !",
        invitedTo: "Vous avez été invité(e) à gérer {{institution}} sur Sprout.",
        emailLabel: "Email",
        newPassword: "Nouveau mot de passe",
        confirmPassword: "Confirmer le mot de passe",
        activateButton: "Activer le compte",
        activating: "Activation...",
        success: "Compte activé avec succès ! Redirection vers la connexion...",
        redirecting: "Vous serez redirigé(e) sous peu.",
        invalidToken: "Ce lien d'invitation est invalide ou a expiré.",
        passwordMismatch: "Les mots de passe ne correspondent pas.",
        passwordTooShort: "Le mot de passe doit contenir au moins 6 caractères.",
        failed: "Échec de l'activation du compte.",
        goToLogin: "Aller à la connexion"
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
