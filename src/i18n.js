import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./local/en.json";    
import zh from "./local/zh.json";   

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      zh: { translation: zh }
    },
    lng: "en",           // 預設語言英文
    fallbackLng: "en",
    interpolation: { escapeValue: false },
  });

export default i18n;
