module.exports = {
  app: {
    name: 'My Budget'
  },

  nav: {
    dashboard: 'Дашборд',
    categories: 'Категории',
    transactions: 'Транзакции',
    wishlist: 'Список желаний',
    calendar: 'Календарь',
    family: 'Семья',
    account: 'Настройки аккаунта',
    logout: 'Выйти',
    login: 'Войти',
    register: 'Регистрация'
  },

  language: {
    label: 'Язык',
    english: 'English',
    russian: 'Русский',
    estonian: 'Eesti',
    short: {
      en: 'EN',
      ru: 'RU',
      et: 'ET'
    }
  },

  accessibility: {
    openAccountMenu: 'Открыть меню аккаунта',
    toggleNavigation: 'Открыть навигацию',
    userAvatar: 'Аватар пользователя'
  },

  auth: {
    accountAccess: 'Доступ к аккаунту',
    accountRecovery: 'Восстановление аккаунта',
    emailVerification: 'Подтверждение email',
    newAccount: 'Новый аккаунт',

    loginTitle: 'Вход',
    loginText: 'Войдите, чтобы продолжить работу с личным бюджетом.',
    registerTitle: 'Регистрация',
    registerText: 'Создайте аккаунт, чтобы начать управлять бюджетом. Перед входом нужно подтвердить email.',
    forgotPasswordTitle: 'Забыли пароль',
    forgotPasswordText: 'Введите подтвержденный email, и мы отправим ссылку для сброса пароля.',
    resetPasswordTitle: 'Сброс пароля',
    resetPasswordText: 'Создайте новый надежный пароль для аккаунта.',
    resendVerificationTitle: 'Повторная отправка подтверждения',
    resendVerificationText: 'Введите email, и мы отправим новую ссылку подтверждения, если аккаунт еще не подтвержден.',

    name: 'Имя',
    email: 'Email',
    password: 'Пароль',
    newPassword: 'Новый пароль',
    confirmPassword: 'Подтвердите пароль',

    namePlaceholder: 'Введите имя',
    emailPlaceholder: 'Введите email',
    passwordPlaceholder: 'Введите пароль',
    createPasswordPlaceholder: 'Создайте пароль',
    confirmPasswordPlaceholder: 'Повторите пароль',
    newPasswordPlaceholder: 'Создайте новый пароль',
    repeatNewPasswordPlaceholder: 'Повторите новый пароль',

    passwordHint: 'Используйте минимум 8 символов: заглавную и строчную букву, цифру и специальный символ.',

    signIn: 'Войти',
    createAccount: 'Создать аккаунт',
    sendResetLink: 'Отправить ссылку',
    changePassword: 'Изменить пароль',
    sendVerificationEmail: 'Отправить подтверждение',

    forgotPassword: 'Забыли пароль?',
    resendVerificationEmail: 'Отправить подтверждение еще раз',
    noAccount: 'Нет аккаунта?',
    createOneHere: 'Создать здесь',
    alreadyHaveAccount: 'Уже есть аккаунт?',
    signInHere: 'Войти здесь',
    rememberedPassword: 'Вспомнили пароль?',
    backToLogin: 'Вернуться ко входу',
    requestNewResetLink: 'Запросить новую ссылку',

    messages: {
      enterEmailAndPassword: 'Введите email и пароль.',
      invalidEmailOrPassword: 'Неверный email или пароль.',
      verifyEmailBeforeLogin: 'Подтвердите email перед входом. Ниже можно запросить новое письмо для подтверждения.',
      failedToSignIn: 'Не удалось войти. Попробуйте еще раз.',
      fillAllFields: 'Заполните все поля.',
      invalidEmail: 'Введите корректный email.',
      passwordsDoNotMatch: 'Пароли не совпадают.',
      userAlreadyExists: 'Пользователь с таким email уже существует.',
      accountCreated: 'Аккаунт создан. Проверьте почту и подтвердите email перед входом.',
      emailNotConfigured: 'Отправка email не настроена. Проверьте SMTP-настройки в .env.',
      failedToRegister: 'Не удалось зарегистрировать пользователя. Попробуйте еще раз.',
      verificationInvalid: 'Ссылка подтверждения недействительна или истекла. Запросите новое письмо.',
      emailVerified: 'Email успешно подтвержден. Теперь можно войти.',
      failedToVerifyEmail: 'Не удалось подтвердить email. Попробуйте еще раз.',
      verificationSentIfNeeded: 'Если такой email существует и еще не подтвержден, новая ссылка подтверждения отправлена.',
      emailAlreadyVerified: 'Этот email уже подтвержден. Вы можете войти.',
      failedToSendVerification: 'Не удалось отправить письмо подтверждения. Попробуйте еще раз.',
      passwordInstructionsSent: 'Если такой email есть в системе, инструкции отправлены на него.',
      failedToSendEmail: 'Не удалось отправить email. Попробуйте еще раз.',
      resetLinkInvalid: 'Ссылка сброса недействительна или истекла. Запросите новую ссылку.',
      failedToOpenResetPage: 'Не удалось открыть страницу сброса. Попробуйте еще раз.',
      passwordChanged: 'Пароль изменен. Теперь можно войти с новым паролем.',
      failedToChangePassword: 'Не удалось изменить пароль. Попробуйте еще раз.'
    },

    passwordRules: {
      atLeastEightCharacters: 'минимум 8 символов',
      lowercase: 'одну строчную букву',
      uppercase: 'одну заглавную букву',
      number: 'одну цифру',
      specialCharacter: 'один специальный символ',
      noSpaces: 'без пробелов',
      messagePrefix: 'Пароль должен содержать'
    }
  }
,

  dashboard: {
    locale: 'ru-RU',
    overview: 'Обзор',
    title: 'Дашборд',
    description: 'Смотрите финансовую сводку и контролируйте движение к целям.',
    addTransaction: 'Добавить транзакцию',
    budgetHealth: 'Состояние бюджета',
    budgetHealthScore: 'Оценка состояния бюджета',
    aboutBudgetHealth: 'О состоянии бюджета',
    budgetHealthPopover: 'Состояние бюджета пересчитывается для выбранного периода.<br><br><strong>Доходы</strong> и накопления улучшают оценку.<br><strong>Высокие расходы</strong> и крупные цели в wishlist снижают ее.<br><strong>Отсутствие финансовой активности</strong> оставляет оценку низкой.',
    howBudgetHealthCalculated: 'Как рассчитывается состояние бюджета',
    noDataYet: 'Пока нет данных',
    budgetSummary: 'Сводка бюджета',
    currentBalance: 'Текущий баланс',
    availableAcrossWorkspace: 'Доступно в этом пространстве',
    income: 'Доходы',
    expenses: 'Расходы',
    savingsRate: 'Процент накоплений',
    yourGoal: 'Ваша цель',
    cashFlowTrend: 'Динамика денежных потоков',
    cashFlowDescriptionPrefix: 'Доходы и расходы за',
    selectedPeriod: 'выбранный период',
    upToToday: 'по сегодняшний день',
    periodControls: 'Управление периодом дашборда',
    previousPeriod: 'Предыдущий период',
    nextPeriod: 'Следующий период',
    periodType: 'Тип периода',
    currentPeriod: 'Текущий период',
    month: 'Месяц',
    year: 'Год',
    today: 'Сегодня',
    currentMonth: 'Текущий месяц',
    cashFlowTrendChart: 'График денежных потоков',
    expensesByCategory: 'Расходы по категориям',
    expensesByCategoryDescriptionPrefix: 'Крупнейшие направления расходов за',
    thisPeriod: 'этот период',
    expensesByCategoryChart: 'График расходов по категориям',
    top: 'Топ',
    totalExpenses: 'Всего расходов',
    categoryIcon: 'иконка категории',
    specialCategoryIcon: 'иконка избранной категории',
    specialDashboardCategories: 'Избранные категории дашборда',
    marked: 'отмечено',
    featuredCategoriesEmpty: 'Отметьте категории расходов через “Добавить на дашборд” на странице категорий.',
    noExpenseCategoriesPrefix: 'За',
    noExpenseCategoriesSuffix: 'категорий расходов пока нет.',
    details: 'Детали дашборда',
    recentTransactions: 'Последние транзакции',
    latestBudgetActivity: 'Последняя активность бюджета в вашем пространстве.',
    latestEntries: 'Последние записи',
    viewAll: 'Смотреть все',
    by: 'От',
    category: 'категория',
    noTransactionsYet: 'Транзакций пока нет. Добавьте первую транзакцию, чтобы начать строить аналитику.',
    upcomingEvents: 'Ближайшие события',
    nearestCalendarEvents: 'Ближайшие события календаря с назначенными цветами.',
    calendarPreview: 'Предпросмотр календаря',
    viewCalendar: 'Открыть календарь',
    noUpcomingEventsYet: 'Ближайших событий пока нет.',
    wishlistImpact: 'Влияние wishlist',
    plannedGoalsDescription: 'Запланированные цели и их влияние на баланс.',
    goalsPreview: 'Предпросмотр целей',
    viewWishlist: 'Открыть wishlist',
    plannedValue: 'Запланированная сумма',
    boughtItems: 'Купленные позиции',
    balanceAfterGoals: 'Баланс после целей',
    image: 'изображение',
    noPlannedWishlistGoalsYet: 'Запланированных целей wishlist пока нет.',
    allDay: 'Весь день',
    noDescription: 'Без описания',
    unknownMember: 'Неизвестный участник',
    familyWorkspace: 'Семейное пространство',
    personalWorkspace: 'Личное пространство',

    period: {
      thisMonth: 'за месяц',
      thisYear: 'за год'
    },

    healthStatus: {
      healthy: 'Здоровый',
      stable: 'Стабильный',
      needsAttention: 'Требует внимания'
    },

    healthText: {
      noData: 'Добавьте доходы и расходы, чтобы рассчитать состояние бюджета.',
      healthy: 'Доходы уверенно опережают расходы за выбранный период.',
      stable: 'Бюджет рабочий, но расходы или запланированные цели требуют внимания.',
      needsAttention: 'Расходы слишком близки к доходам. Сначала проверьте категории трат.'
    },

    insight: {
      biggestExpensePrefix: 'Самая большая категория расходов —',
      biggestExpenseMiddle: 'Она занимает',
      biggestExpenseSuffix: 'расходов за',
      addExpenses: 'Добавьте расходные транзакции, чтобы увидеть главную категорию трат.'
    },

    messages: {
      noActivityYet: 'Активности пока нет',
      newActivity: 'Новая активность',
      vsPreviousPeriod: 'к предыдущему периоду',
      failedToLoadAnalytics: 'Не удалось загрузить аналитику дашборда.'
    }
  }
,

  account: {
    pageTitle: 'Аккаунт',
    personalWorkspace: 'Личное пространство',
    title: 'Настройки аккаунта',
    description: 'Управляйте профилем, аватаром, паролем и доступом к рабочему пространству в одном месте.',
    avatar: 'Аватар',
    changeAvatar: 'Изменить аватар',
    familyAvatarAlt: 'Аватар семьи',
    userAvatarAlt: 'Аватар пользователя',
    memberSince: 'В аккаунте с',
    avatarHelp: 'Нажмите на аватар, чтобы загрузить JPG, PNG · до 15 МБ',
    deleteAvatar: 'Удалить аватар',
    yourFamily: 'Ваша семья',
    yourRole: 'Ваша роль',
    ownerCrown: 'Корона владельца',
    profileSettings: 'Настройки профиля',
    name: 'Имя',
    email: 'Email',
    saveChanges: 'Сохранить изменения',
    changePassword: 'Изменить пароль',
    currentPassword: 'Текущий пароль',
    currentPasswordPlaceholder: 'Введите текущий пароль',
    newPassword: 'Новый пароль',
    newPasswordPlaceholder: 'Введите новый пароль',
    repeatNewPassword: 'Повторите новый пароль',
    repeatNewPasswordPlaceholder: 'Повторите новый пароль',
    updatePassword: 'Обновить пароль',
    dangerZone: 'Опасная зона',
    dangerDescription: 'Удаление аккаунта необратимо. Чтобы снова пользоваться приложением, нужно будет создать новый аккаунт.',
    deleteAccount: 'Удалить аккаунт',
    deleteAccountHint: 'Подтверждение будет в модальном окне.',
    deleteAccountTitle: 'Удалить аккаунт навсегда',
    close: 'Закрыть',
    deleteAccountWarning: 'Это действие нельзя отменить. Аватар и запись аккаунта будут удалены навсегда.',
    typeDeletePrefix: 'Введите',
    typeDeleteSuffix: 'для подтверждения.',
    cancel: 'Отмена',
    deleteForever: 'Удалить навсегда',

    roles: {
      owner: 'Владелец',
      editor: 'Редактор',
      viewer: 'Просмотр',
      personal: 'Личный'
    },

    messages: {
      failedToLoadAccount: 'Не удалось загрузить данные аккаунта.',
      nameEmailRequired: 'Имя и email обязательны.',
      invalidEmail: 'Введите корректный email.',
      emailAlreadyUsed: 'Этот email уже используется другим аккаунтом.',
      accountUpdated: 'Данные аккаунта обновлены.',
      emailChangedVerify: 'Email изменен. Подтвердите новый email перед входом.',
      emailNotConfiguredNotChanged: 'Отправка email не настроена. Email не был изменен.',
      failedToUpdateAccount: 'Не удалось обновить данные аккаунта.',
      uploadJpgPngOnly: 'Загрузите изображение только JPG или PNG.',
      failedToUploadAvatar: 'Не удалось загрузить аватар.',
      avatarTooLarge: 'Размер аватара должен быть не больше 15 МБ.',
      chooseImageFirst: 'Сначала выберите изображение.',
      avatarUpdated: 'Аватар обновлен.',
      failedToProcessAvatar: 'Не удалось обработать аватар. Загрузите корректное изображение JPG или PNG.',
      avatarDeleted: 'Аватар удален.',
      failedToDeleteAvatar: 'Не удалось удалить аватар.',
      fillPasswordFields: 'Заполните все поля пароля.',
      newPasswordsDoNotMatch: 'Новые пароли не совпадают.',
      currentPasswordIncorrect: 'Текущий пароль неверный.',
      passwordChanged: 'Пароль изменен.',
      failedToChangePassword: 'Не удалось изменить пароль.',
      typeDeleteToConfirm: 'Введите DELETE, чтобы подтвердить удаление аккаунта.',
      failedToDeleteAccount: 'Не удалось удалить аккаунт. Попробуйте еще раз.'
    }
  }

};
