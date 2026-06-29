const translations = require('./translations');

const SUPPORTED_LANGUAGES = ['en', 'ru', 'et'];
const DEFAULT_LANGUAGE = 'en';

function getNestedValue(object, key) {
  return key.split('.').reduce((current, part) => {
    if (current && Object.prototype.hasOwnProperty.call(current, part)) {
      return current[part];
    }

    return null;
  }, object);
}

function createTranslator(language) {
  return function t(key) {
    const translatedValue =
      getNestedValue(translations[language], key) ||
      getNestedValue(translations[DEFAULT_LANGUAGE], key);

    return translatedValue || key;
  };
}

function attachI18n(req, res, next) {
  const sessionLanguage = req.session?.language;
  const language = SUPPORTED_LANGUAGES.includes(sessionLanguage)
    ? sessionLanguage
    : DEFAULT_LANGUAGE;

  req.language = language;
  req.t = createTranslator(language);

  res.locals.language = language;
  res.locals.languages = SUPPORTED_LANGUAGES;
  res.locals.currentPath = req.originalUrl || req.url || '/';
  res.locals.t = req.t;

  next();
}

module.exports = {
  attachI18n,
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE
};
