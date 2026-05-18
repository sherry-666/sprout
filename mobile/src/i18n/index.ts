import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const LANG_KEY = 'sprout_lang';

const resources = {
  en: {
    translation: {
      tabs: {
        classes: 'Classes',
        quickLog: 'Quick Log',
        settings: 'Settings',
      },
      profile: {
        title: 'My Profile',
        role: 'Role',
        name: 'Name',
        signOut: 'Sign Out',
        signOutTitle: 'Sign Out',
        signOutMsg: 'Are you sure you want to sign out?',
        cancel: 'Cancel',
      },
      settings: {
        title: 'Settings',
        accountSection: 'Account',
        myProfile: 'My Profile',
        appSection: 'App Preferences',
        language: 'Language',
      },
      language: {
        title: 'Language',
        en: 'English',
        zh: '中文',
        fr: 'Français',
      },
      roles: {
        educator: 'Educator',
        parent: 'Parent',
        admin: 'Institution Admin',
        super_admin: 'System Admin',
      },
      classes: {
        title: 'My Classes',
        noClasses: 'No classes assigned yet.',
        noClassesHint: 'Ask your institution admin to assign you to a class.',
        kids: '{{count}} kid',
        kids_other: '{{count}} kids',
        educators: '{{count}} educator',
        educators_other: '{{count}} educators',
      },
      quickLog: {
        title: 'Quick Log',
        subtitle: 'Log an activity for a class',
        selectClass: 'Select a class',
        noClasses: 'No classes assigned',
        noClassesHint: 'Ask your admin to assign you to a class.',
        activityType: 'Activity Type',
        note: 'Note',
        send: 'Send Update',
        sending: 'Sending…',
        required: 'Please write something before sending.',
        successTitle: 'Sent!',
        successMsg: 'Activity logged for {{name}}.',
        error: 'Failed to log activity.',
        meal: 'Meal',
        nap: 'Nap',
        activity: 'Activity',
        photo: 'Photo',
        mealHint: 'What did they eat?',
        napHint: 'How long did they sleep?',
        activityHint: 'What activity did they do?',
        photoHint: 'Describe what is happening…',
      },
    },
  },
  zh: {
    translation: {
      tabs: {
        classes: '班级',
        quickLog: '快速记录',
        settings: '设置',
      },
      profile: {
        title: '我的资料',
        role: '角色',
        name: '姓名',
        signOut: '退出登录',
        signOutTitle: '退出登录',
        signOutMsg: '确定要退出登录吗？',
        cancel: '取消',
      },
      settings: {
        title: '设置',
        accountSection: '账户',
        myProfile: '我的资料',
        appSection: '应用偏好',
        language: '语言',
      },
      language: {
        title: '语言',
        en: 'English',
        zh: '中文',
        fr: 'Français',
      },
      roles: {
        educator: '幼教老师',
        parent: '家长',
        admin: '机构管理员',
        super_admin: '系统管理员',
      },
      classes: {
        title: '我的班级',
        noClasses: '暂无分配的班级。',
        noClassesHint: '请联系机构管理员将您分配到班级。',
        kids: '{{count}} 名儿童',
        kids_other: '{{count}} 名儿童',
        educators: '{{count}} 位教师',
        educators_other: '{{count}} 位教师',
      },
      quickLog: {
        title: '快速记录',
        subtitle: '为班级记录活动',
        selectClass: '选择班级',
        noClasses: '未分配班级',
        noClassesHint: '请联系管理员将您分配到班级。',
        activityType: '活动类型',
        note: '备注',
        send: '发送更新',
        sending: '发送中…',
        required: '请在发送前填写内容。',
        successTitle: '已发送！',
        successMsg: '已为{{name}}记录活动。',
        error: '记录活动失败。',
        meal: '餐食',
        nap: '午休',
        activity: '活动',
        photo: '照片',
        mealHint: '他们吃了什么？',
        napHint: '睡了多长时间？',
        activityHint: '他们做了什么活动？',
        photoHint: '描述正在发生的事情…',
      },
    },
  },
  fr: {
    translation: {
      tabs: {
        classes: 'Classes',
        quickLog: 'Journal rapide',
        settings: 'Paramètres',
      },
      profile: {
        title: 'Mon profil',
        role: 'Rôle',
        name: 'Nom',
        signOut: 'Se déconnecter',
        signOutTitle: 'Se déconnecter',
        signOutMsg: 'Êtes-vous sûr de vouloir vous déconnecter ?',
        cancel: 'Annuler',
      },
      settings: {
        title: 'Paramètres',
        accountSection: 'Compte',
        myProfile: 'Mon profil',
        appSection: 'Préférences',
        language: 'Langue',
      },
      language: {
        title: 'Langue',
        en: 'English',
        zh: '中文',
        fr: 'Français',
      },
      roles: {
        educator: 'Éducateur',
        parent: 'Parent',
        admin: "Administrateur d'institution",
        super_admin: 'Administrateur système',
      },
      classes: {
        title: 'Mes classes',
        noClasses: 'Aucune classe assignée.',
        noClassesHint: "Demandez à votre administrateur de vous assigner à une classe.",
        kids: '{{count}} enfant',
        kids_other: '{{count}} enfants',
        educators: '{{count}} éducateur',
        educators_other: '{{count}} éducateurs',
      },
      quickLog: {
        title: 'Journal rapide',
        subtitle: 'Enregistrer une activité pour une classe',
        selectClass: 'Sélectionner une classe',
        noClasses: 'Aucune classe assignée',
        noClassesHint: "Demandez à votre administrateur de vous assigner à une classe.",
        activityType: "Type d'activité",
        note: 'Note',
        send: 'Envoyer',
        sending: 'Envoi…',
        required: "Veuillez écrire quelque chose avant d'envoyer.",
        successTitle: 'Envoyé !',
        successMsg: "Activité enregistrée pour {{name}}.",
        error: "Échec de l'enregistrement.",
        meal: 'Repas',
        nap: 'Sieste',
        activity: 'Activité',
        photo: 'Photo',
        mealHint: "Qu'ont-ils mangé ?",
        napHint: 'Combien de temps ont-ils dormi ?',
        activityHint: 'Quelle activité ont-ils faite ?',
        photoHint: 'Décrivez ce qui se passe…',
      },
    },
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: 'en',
  fallbackLng: 'en',
  compatibilityJSON: 'v3',
  interpolation: { escapeValue: false },
});

export async function loadSavedLanguage() {
  const lang = await AsyncStorage.getItem(LANG_KEY);
  if (lang) await i18n.changeLanguage(lang);
}

export async function setLanguage(lang: string) {
  await i18n.changeLanguage(lang);
  await AsyncStorage.setItem(LANG_KEY, lang);
}

export default i18n;
