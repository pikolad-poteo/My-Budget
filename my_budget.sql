-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Хост: localhost
-- Время создания: Апр 25 2026 г., 12:38
-- Версия сервера: 10.4.28-MariaDB
-- Версия PHP: 8.2.4

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- База данных: `my_budget`
--

-- --------------------------------------------------------

--
-- Структура таблицы `categories`
--

CREATE TABLE `categories` (
  `id` int(10) UNSIGNED NOT NULL,
  `user_id` int(10) UNSIGNED NOT NULL,
  `family_id` int(10) UNSIGNED DEFAULT NULL,
  `name` varchar(100) NOT NULL,
  `type` enum('income','expense') NOT NULL,
  `color` varchar(20) DEFAULT '#6c757d',
  `icon` varchar(50) DEFAULT 'tag',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Дамп данных таблицы `categories`
--

INSERT INTO `categories` (`id`, `user_id`, `family_id`, `name`, `type`, `color`, `icon`, `created_at`) VALUES
(1, 2, NULL, 'Bank', 'income', '#8d8600', 'bank', '2026-04-21 16:31:02'),
(3, 2, 1, 'Salary', 'income', '#0061ff', 'clipboard-data', '2026-04-21 20:02:38'),
(6, 1, NULL, 'Home', 'expense', '#f97316', 'house-door', '2026-04-23 06:20:19'),
(10, 2, NULL, 'Car', 'expense', '#4d22b3', 'car-front', '2026-04-23 07:03:50'),
(12, 2, 1, 'Food', 'expense', '#22c55e', 'basket2', '2026-04-23 11:02:07'),
(20, 1, NULL, 'Groceries', 'expense', '#22c55e', 'basket', '2026-04-23 11:59:23'),
(21, 1, NULL, 'Transport', 'expense', '#3b82f6', 'car-front', '2026-04-23 11:59:23'),
(22, 1, NULL, 'Coffee', 'expense', '#a16207', 'cup-hot', '2026-04-23 11:59:23'),
(23, 1, NULL, 'Shopping', 'expense', '#ec4899', 'bag', '2026-04-23 11:59:23'),
(24, 1, NULL, 'Health', 'expense', '#ef4444', 'heart-pulse', '2026-04-23 11:59:23'),
(25, 1, 1, 'Home Bills', 'expense', '#6366f1', 'house', '2026-04-23 11:59:23'),
(26, 1, 1, 'Family Food', 'expense', '#10b981', 'tag', '2026-04-23 11:59:23'),
(27, 1, 1, 'Kids', 'expense', '#f59e0b', 'emoji-smile', '2026-04-23 11:59:23'),
(28, 1, NULL, 'Salary', 'income', '#16a34a', 'cash-stack', '2026-04-23 11:59:23'),
(29, 1, NULL, 'Freelance', 'income', '#06b6d4', 'laptop', '2026-04-23 11:59:23'),
(30, 1, NULL, 'Refund', 'income', '#84cc16', 'arrow-counterclockwise', '2026-04-23 11:59:23'),
(31, 1, 1, 'Family Income', 'income', '#8b5cf6', 'piggy-bank', '2026-04-23 11:59:23');

-- --------------------------------------------------------

--
-- Структура таблицы `families`
--

CREATE TABLE `families` (
  `id` int(10) UNSIGNED NOT NULL,
  `name` varchar(100) NOT NULL,
  `owner_user_id` int(10) UNSIGNED NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Дамп данных таблицы `families`
--

INSERT INTO `families` (`id`, `name`, `owner_user_id`, `created_at`) VALUES
(1, 'Dudins', 3, '2026-04-21 15:24:14');

-- --------------------------------------------------------

--
-- Структура таблицы `family_members`
--

CREATE TABLE `family_members` (
  `id` int(10) UNSIGNED NOT NULL,
  `family_id` int(10) UNSIGNED NOT NULL,
  `user_id` int(10) UNSIGNED NOT NULL,
  `role` enum('owner','member') NOT NULL DEFAULT 'member',
  `joined_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Дамп данных таблицы `family_members`
--

INSERT INTO `family_members` (`id`, `family_id`, `user_id`, `role`, `joined_at`) VALUES
(1, 1, 3, 'owner', '2026-04-21 15:24:14'),
(2, 1, 1, 'member', '2026-04-21 15:24:26'),
(3, 1, 2, 'member', '2026-04-21 15:25:16');

-- --------------------------------------------------------

--
-- Структура таблицы `transactions`
--

CREATE TABLE `transactions` (
  `id` int(10) UNSIGNED NOT NULL,
  `user_id` int(10) UNSIGNED NOT NULL,
  `family_id` int(10) UNSIGNED DEFAULT NULL,
  `category_id` int(10) UNSIGNED NOT NULL,
  `type` enum('income','expense') NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `transaction_date` date NOT NULL,
  `paid_by_user_id` int(10) UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Дамп данных таблицы `transactions`
--

INSERT INTO `transactions` (`id`, `user_id`, `family_id`, `category_id`, `type`, `amount`, `description`, `transaction_date`, `paid_by_user_id`, `created_at`) VALUES
(4, 2, 1, 12, 'expense', -5.00, 'Apple', '2026-04-23', 3, '2026-04-23 11:51:47'),
(5, 2, NULL, 1, 'income', 18.79, 'Save money', '2026-04-22', 3, '2026-04-23 11:52:31'),
(6, 2, 1, 12, 'expense', -15.00, 'Milk, beef', '2026-04-29', 1, '2026-04-23 11:57:05'),
(7, 1, NULL, 20, 'expense', -52.40, 'Supermarket weekly shopping', '2026-04-01', 1, '2026-04-23 11:59:36'),
(8, 1, NULL, 21, 'expense', -2.50, 'Bus ticket', '2026-04-02', 1, '2026-04-23 11:59:36'),
(9, 1, NULL, 22, 'expense', -4.80, 'Morning coffee', '2026-04-02', 1, '2026-04-23 11:59:36'),
(10, 1, NULL, 28, 'income', 1850.00, 'Monthly salary', '2026-04-03', 1, '2026-04-23 11:59:36'),
(11, 1, NULL, 23, 'expense', -79.99, 'New headphones', '2026-04-04', 1, '2026-04-23 11:59:36'),
(12, 1, NULL, 24, 'expense', -18.20, 'Pharmacy purchase', '2026-04-05', 1, '2026-04-23 11:59:36'),
(13, 1, NULL, 29, 'income', 240.00, 'Landing page edits', '2026-04-06', 1, '2026-04-23 11:59:36'),
(14, 1, NULL, 20, 'expense', -34.15, 'Fresh food market', '2026-04-07', 1, '2026-04-23 11:59:36'),
(15, 1, NULL, 21, 'expense', -15.00, 'Taxi ride', '2026-04-07', 1, '2026-04-23 11:59:36'),
(16, 1, NULL, 30, 'income', 23.90, 'Returned order refund', '2026-04-08', 1, '2026-04-23 11:59:36'),
(17, 1, 1, 25, 'expense', -95.00, 'Electricity bill', '2026-04-09', 1, '2026-04-23 11:59:36'),
(18, 1, 1, 26, 'expense', -88.60, 'Family dinner groceries', '2026-04-10', 1, '2026-04-23 11:59:36'),
(19, 1, 1, 27, 'expense', -41.30, 'School supplies', '2026-04-11', 1, '2026-04-23 11:59:36'),
(20, 1, 1, 31, 'income', 300.00, 'Shared cashback transfer', '2026-04-12', 1, '2026-04-23 11:59:36'),
(21, 1, 1, 25, 'expense', -47.50, 'Internet payment', '2026-04-13', 1, '2026-04-23 11:59:36'),
(22, 1, 1, 26, 'expense', -64.25, 'Weekend family groceries', '2026-04-14', 1, '2026-04-23 11:59:36'),
(23, 1, 1, 27, 'expense', -27.00, 'Kids entertainment', '2026-04-15', 1, '2026-04-23 11:59:36'),
(24, 1, NULL, 22, 'expense', -6.20, 'Coffee with colleague', '2026-04-16', 1, '2026-04-23 11:59:36'),
(25, 1, NULL, 23, 'expense', -129.00, 'Spring clothes order', '2026-04-17', 1, '2026-04-23 11:59:36'),
(26, 1, NULL, 20, 'expense', -61.75, 'Big grocery refill', '2026-04-18', 1, '2026-04-23 11:59:36'),
(27, 2, 1, 12, 'expense', -12.00, NULL, '2026-04-29', 3, '2026-04-24 13:56:57'),
(28, 2, NULL, 10, 'expense', -200.00, NULL, '2026-04-29', 3, '2026-04-24 13:57:13'),
(29, 2, 1, 25, 'expense', -500.00, NULL, '2026-03-20', 3, '2026-04-24 13:57:40'),
(30, 2, 1, 27, 'expense', -400.00, NULL, '2026-03-31', 3, '2026-04-24 13:58:13'),
(31, 2, 1, 12, 'expense', -120.00, NULL, '2026-03-19', 3, '2026-04-24 13:58:43');

-- --------------------------------------------------------

--
-- Структура таблицы `users`
--

CREATE TABLE `users` (
  `id` int(10) UNSIGNED NOT NULL,
  `name` varchar(100) NOT NULL,
  `email` varchar(150) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Дамп данных таблицы `users`
--

INSERT INTO `users` (`id`, `name`, `email`, `password_hash`, `created_at`) VALUES
(1, 'Test', 'admin@test.local', '$2b$10$8rK/mx1D3638jwDTcMuHwOUxC/.eYaaiQAY4E7wlkwCI75fRnDynS', '2026-04-21 14:59:58'),
(2, 'Test2', 'admin@myshop.local', '$2b$10$xNEaQNhWxaNaqX7u174A6ONpeCONdEnm8L7HaQ2aQHXb/017weKWS', '2026-04-21 15:05:23'),
(3, 'Vladislav', 'pikoladgame2004@gmail.com', '$2b$10$hlcsuKTAS7NKMJbSIdZuXOm.WKroa1S8DKUZEktEV7BC81ajoxGNS', '2026-04-21 15:23:08');

--
-- Индексы сохранённых таблиц
--

--
-- Индексы таблицы `categories`
--
ALTER TABLE `categories`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_categories_user` (`user_id`),
  ADD KEY `fk_categories_family` (`family_id`);

--
-- Индексы таблицы `families`
--
ALTER TABLE `families`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_families_owner` (`owner_user_id`);

--
-- Индексы таблицы `family_members`
--
ALTER TABLE `family_members`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_family_user` (`family_id`,`user_id`),
  ADD KEY `fk_family_members_user` (`user_id`);

--
-- Индексы таблицы `transactions`
--
ALTER TABLE `transactions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_transactions_user` (`user_id`),
  ADD KEY `fk_transactions_family` (`family_id`),
  ADD KEY `fk_transactions_category` (`category_id`),
  ADD KEY `fk_transactions_paid_by_user` (`paid_by_user_id`);

--
-- Индексы таблицы `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT для сохранённых таблиц
--

--
-- AUTO_INCREMENT для таблицы `categories`
--
ALTER TABLE `categories`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=32;

--
-- AUTO_INCREMENT для таблицы `families`
--
ALTER TABLE `families`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT для таблицы `family_members`
--
ALTER TABLE `family_members`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT для таблицы `transactions`
--
ALTER TABLE `transactions`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=33;

--
-- AUTO_INCREMENT для таблицы `users`
--
ALTER TABLE `users`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- Ограничения внешнего ключа сохраненных таблиц
--

--
-- Ограничения внешнего ключа таблицы `categories`
--
ALTER TABLE `categories`
  ADD CONSTRAINT `fk_categories_family` FOREIGN KEY (`family_id`) REFERENCES `families` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_categories_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Ограничения внешнего ключа таблицы `families`
--
ALTER TABLE `families`
  ADD CONSTRAINT `fk_families_owner` FOREIGN KEY (`owner_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Ограничения внешнего ключа таблицы `family_members`
--
ALTER TABLE `family_members`
  ADD CONSTRAINT `fk_family_members_family` FOREIGN KEY (`family_id`) REFERENCES `families` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_family_members_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Ограничения внешнего ключа таблицы `transactions`
--
ALTER TABLE `transactions`
  ADD CONSTRAINT `fk_transactions_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_transactions_family` FOREIGN KEY (`family_id`) REFERENCES `families` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_transactions_paid_by_user` FOREIGN KEY (`paid_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_transactions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
