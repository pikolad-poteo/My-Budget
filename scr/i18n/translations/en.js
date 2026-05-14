module.exports = {
  app: {
    name: 'My Budget'
  },

  nav: {
    dashboard: 'Dashboard',
    categories: 'Categories',
    transactions: 'Transactions',
    wishlist: 'Wishlist',
    calendar: 'Calendar',
    family: 'Family',
    account: 'Account settings',
    logout: 'Logout',
    login: 'Login',
    register: 'Register'
  },

  language: {
    label: 'Language',
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
    openAccountMenu: 'Open account menu',
    toggleNavigation: 'Toggle navigation',
    userAvatar: 'User avatar'
  },

  auth: {
    accountAccess: 'Account access',
    accountRecovery: 'Account recovery',
    emailVerification: 'Email verification',
    newAccount: 'New account',

    loginTitle: 'Login',
    loginText: 'Sign in to continue working with your personal budget.',
    registerTitle: 'Register',
    registerText: 'Create an account to start managing your budget. You will need to verify your email before signing in.',
    forgotPasswordTitle: 'Forgot password',
    forgotPasswordText: 'Enter your verified email and we will send a password reset link.',
    resetPasswordTitle: 'Reset password',
    resetPasswordText: 'Create a new secure password for your account.',
    resendVerificationTitle: 'Resend verification email',
    resendVerificationText: 'Enter your email and we will send a new verification link if the account is not verified yet.',

    name: 'Name',
    email: 'Email',
    password: 'Password',
    newPassword: 'New password',
    confirmPassword: 'Confirm password',

    namePlaceholder: 'Enter your name',
    emailPlaceholder: 'Enter your email',
    passwordPlaceholder: 'Enter your password',
    createPasswordPlaceholder: 'Create a password',
    confirmPasswordPlaceholder: 'Repeat your password',
    newPasswordPlaceholder: 'Create a new password',
    repeatNewPasswordPlaceholder: 'Repeat your new password',

    passwordHint: 'Use at least 8 characters with uppercase, lowercase, number and special character.',

    signIn: 'Sign in',
    createAccount: 'Create account',
    sendResetLink: 'Send reset link',
    changePassword: 'Change password',
    sendVerificationEmail: 'Send verification email',

    forgotPassword: 'Forgot password?',
    resendVerificationEmail: 'Resend verification email',
    noAccount: 'Don’t have an account?',
    createOneHere: 'Create one here',
    alreadyHaveAccount: 'Already have an account?',
    signInHere: 'Sign in here',
    rememberedPassword: 'Remembered your password?',
    backToLogin: 'Back to login',
    requestNewResetLink: 'Request a new reset link',

    messages: {
      enterEmailAndPassword: 'Please enter both email and password.',
      invalidEmailOrPassword: 'Invalid email or password.',
      verifyEmailBeforeLogin: 'Please verify your email before signing in. You can request a new verification email below.',
      failedToSignIn: 'Failed to sign in. Please try again.',
      fillAllFields: 'Please fill in all fields.',
      invalidEmail: 'Please enter a valid email address.',
      passwordsDoNotMatch: 'Passwords do not match.',
      userAlreadyExists: 'A user with this email already exists.',
      accountCreated: 'Account created. Please check your email and verify your account before signing in.',
      emailNotConfigured: 'Email sending is not configured. Please check SMTP settings in .env.',
      failedToRegister: 'Failed to register user. Please try again.',
      verificationInvalid: 'Verification link is invalid or expired. Request a new verification email.',
      emailVerified: 'Email verified successfully. You can now sign in.',
      failedToVerifyEmail: 'Failed to verify email. Please try again.',
      verificationSentIfNeeded: 'If this email exists and is not verified, a new verification link has been sent.',
      emailAlreadyVerified: 'This email is already verified. You can sign in.',
      failedToSendVerification: 'Failed to send verification email. Please try again.',
      passwordInstructionsSent: 'If this email exists in our system, instructions have been sent to it.',
      failedToSendEmail: 'Failed to send email. Please try again.',
      resetLinkInvalid: 'Reset link is invalid or expired. Request a new password reset link.',
      failedToOpenResetPage: 'Failed to open reset page. Please try again.',
      passwordChanged: 'Password was changed. You can now sign in with your new password.',
      failedToChangePassword: 'Failed to change password. Please try again.'
    },

    passwordRules: {
      atLeastEightCharacters: 'at least 8 characters',
      lowercase: 'one lowercase letter',
      uppercase: 'one uppercase letter',
      number: 'one number',
      specialCharacter: 'one special character',
      noSpaces: 'no spaces',
      messagePrefix: 'Password must contain'
    }
  }
,

  dashboard: {
    locale: 'en-US',
    overview: 'Overview',
    title: 'Dashboard',
    description: 'See your financial overview and stay on track with your goals.',
    addTransaction: 'Add transaction',
    budgetHealth: 'Budget health',
    budgetHealthScore: 'Budget health score',
    aboutBudgetHealth: 'About Budget Health',
    budgetHealthPopover: 'Budget health is recalculated from the selected period.<br><br><strong>Income</strong> and savings improve the score.<br><strong>High expenses</strong> and large planned wishlist goals reduce it.<br><strong>No financial activity</strong> keeps the score low.',
    howBudgetHealthCalculated: 'How Budget health is calculated',
    noDataYet: 'No data yet',
    budgetSummary: 'Budget summary',
    currentBalance: 'Current balance',
    availableAcrossWorkspace: 'Available across this workspace',
    income: 'Income',
    expenses: 'Expenses',
    savingsRate: 'Savings rate',
    yourGoal: 'Your goal',
    cashFlowTrend: 'Cash flow trend',
    cashFlowDescriptionPrefix: 'Income and expenses for',
    selectedPeriod: 'selected period',
    upToToday: 'up to today',
    periodControls: 'Dashboard period controls',
    previousPeriod: 'Previous period',
    nextPeriod: 'Next period',
    periodType: 'Period type',
    currentPeriod: 'Current period',
    month: 'Month',
    year: 'Year',
    today: 'Today',
    currentMonth: 'Current month',
    cashFlowTrendChart: 'Cash flow trend chart',
    expensesByCategory: 'Expenses by category',
    expensesByCategoryDescriptionPrefix: 'Largest spending areas for',
    thisPeriod: 'this period',
    expensesByCategoryChart: 'Expenses by category chart',
    top: 'Top',
    totalExpenses: 'Total expenses',
    categoryIcon: 'category icon',
    specialCategoryIcon: 'special category icon',
    specialDashboardCategories: 'Special dashboard categories',
    marked: 'marked',
    featuredCategoriesEmpty: 'Mark expense categories with “Add to dashboard” on the Categories page.',
    noExpenseCategoriesPrefix: 'No expense categories for',
    noExpenseCategoriesSuffix: 'yet.',
    details: 'Dashboard details',
    recentTransactions: 'Recent transactions',
    latestBudgetActivity: 'Latest budget activity in your workspace.',
    latestEntries: 'Latest entries',
    viewAll: 'View all',
    by: 'By',
    category: 'category',
    noTransactionsYet: 'No transactions yet. Add your first transaction to start building analytics.',
    upcomingEvents: 'Upcoming events',
    nearestCalendarEvents: 'Nearest calendar events with their assigned colors.',
    calendarPreview: 'Calendar preview',
    viewCalendar: 'View calendar',
    noUpcomingEventsYet: 'No upcoming events yet.',
    wishlistImpact: 'Wishlist impact',
    plannedGoalsDescription: 'Planned goals and how they affect your balance.',
    goalsPreview: 'Goals preview',
    viewWishlist: 'View wishlist',
    plannedValue: 'Planned value',
    boughtItems: 'Bought items',
    balanceAfterGoals: 'Balance after goals',
    image: 'image',
    noPlannedWishlistGoalsYet: 'No planned wishlist goals yet.',
    allDay: 'All day',
    noDescription: 'No description',
    unknownMember: 'Unknown member',
    familyWorkspace: 'Family workspace',
    personalWorkspace: 'Personal workspace',

    period: {
      thisMonth: 'this month',
      thisYear: 'this year'
    },

    healthStatus: {
      healthy: 'Healthy',
      stable: 'Stable',
      needsAttention: 'Needs attention'
    },

    healthText: {
      noData: 'Add income and expense transactions to calculate budget health.',
      healthy: 'Income is comfortably ahead of expenses for the selected period.',
      stable: 'The budget is usable, but expenses or planned goals need attention.',
      needsAttention: 'Expenses are too close to income. Review spending categories first.'
    },

    insight: {
      biggestExpensePrefix: 'Your biggest expense category is',
      biggestExpenseMiddle: 'It takes',
      biggestExpenseSuffix: 'of expenses for',
      addExpenses: 'Add expense transactions to see your strongest spending category.'
    },

    messages: {
      noActivityYet: 'No activity yet',
      newActivity: 'New activity',
      vsPreviousPeriod: 'vs previous period',
      failedToLoadAnalytics: 'Failed to load dashboard analytics.'
    }
  }
,

  account: {
    pageTitle: 'Account',
    personalWorkspace: 'Personal workspace',
    title: 'Account settings',
    description: 'Manage your profile details, avatar, password and workspace access in one place.',
    avatar: 'Avatar',
    changeAvatar: 'Change avatar',
    familyAvatarAlt: 'Family avatar',
    userAvatarAlt: 'User avatar',
    memberSince: 'Member since',
    avatarHelp: 'Click avatar to upload JPG, PNG · up to 15 MB',
    deleteAvatar: 'Delete avatar',
    yourFamily: 'Your family',
    yourRole: 'Your role',
    ownerCrown: 'Owner crown',
    profileSettings: 'Profile settings',
    name: 'Name',
    email: 'Email',
    saveChanges: 'Save changes',
    changePassword: 'Change password',
    currentPassword: 'Current password',
    currentPasswordPlaceholder: 'Enter current password',
    newPassword: 'New password',
    newPasswordPlaceholder: 'Enter new password',
    repeatNewPassword: 'Repeat new password',
    repeatNewPasswordPlaceholder: 'Repeat new password',
    updatePassword: 'Update password',
    dangerZone: 'Danger zone',
    dangerDescription: 'Deleting your account is permanent and cannot be undone. You will need to create a new account again.',
    deleteAccount: 'Delete account',
    deleteAccountHint: 'You will confirm this in a modal popup.',
    deleteAccountTitle: 'Delete account permanently',
    close: 'Close',
    deleteAccountWarning: 'This action cannot be undone. Your avatar and account record will be removed permanently.',
    typeDeletePrefix: 'Type',
    typeDeleteSuffix: 'to confirm.',
    cancel: 'Cancel',
    deleteForever: 'Delete forever',

    roles: {
      owner: 'Owner',
      editor: 'Editor',
      viewer: 'Viewer',
      personal: 'Personal'
    },

    messages: {
      failedToLoadAccount: 'Failed to load account data.',
      nameEmailRequired: 'Name and email are required.',
      invalidEmail: 'Please enter a valid email address.',
      emailAlreadyUsed: 'This email is already used by another account.',
      accountUpdated: 'Account details were updated.',
      emailChangedVerify: 'Email was changed. Please verify your new email before signing in.',
      emailNotConfiguredNotChanged: 'Email sending is not configured. Email was not changed.',
      failedToUpdateAccount: 'Failed to update account details.',
      uploadJpgPngOnly: 'Upload JPG or PNG image only.',
      failedToUploadAvatar: 'Failed to upload avatar.',
      avatarTooLarge: 'Avatar image must be 15 MB or smaller.',
      chooseImageFirst: 'Choose an image file first.',
      avatarUpdated: 'Avatar was updated.',
      failedToProcessAvatar: 'Failed to process avatar. Please upload a valid JPG or PNG image.',
      avatarDeleted: 'Avatar was deleted.',
      failedToDeleteAvatar: 'Failed to delete avatar.',
      fillPasswordFields: 'Fill in all password fields.',
      newPasswordsDoNotMatch: 'New passwords do not match.',
      currentPasswordIncorrect: 'Current password is incorrect.',
      passwordChanged: 'Password was changed.',
      failedToChangePassword: 'Failed to change password.',
      typeDeleteToConfirm: 'Type DELETE to confirm account deletion.',
      failedToDeleteAccount: 'Failed to delete account. Please try again.'
    }
  }

};
