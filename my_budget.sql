-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Хост: 127.0.0.1
-- Время создания: Май 21 2026 г., 17:42
-- Версия сервера: 10.4.32-MariaDB
-- Версия PHP: 8.0.30

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
-- Структура таблицы `calendar_events`
--

CREATE TABLE `calendar_events` (
  `id` int(10) UNSIGNED NOT NULL,
  `user_id` int(10) UNSIGNED NOT NULL,
  `family_id` int(10) UNSIGNED DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `event_date` date NOT NULL,
  `event_time` time DEFAULT NULL,
  `end_time` time DEFAULT NULL,
  `type` enum('event','reminder','task','birthday') NOT NULL DEFAULT 'event',
  `member_name` varchar(100) DEFAULT NULL,
  `description` varchar(1000) DEFAULT NULL,
  `color` varchar(20) NOT NULL DEFAULT '#0d6efd',
  `is_all_day` tinyint(1) NOT NULL DEFAULT 0,
  `is_important` tinyint(1) NOT NULL DEFAULT 0,
  `is_recurring` tinyint(1) NOT NULL DEFAULT 0,
  `recurring_type` enum('none','daily','weekly','monthly','yearly') NOT NULL DEFAULT 'none',
  `is_completed` tinyint(1) NOT NULL DEFAULT 0,
  `completed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Дамп данных таблицы `calendar_events`
--

INSERT INTO `calendar_events` (`id`, `user_id`, `family_id`, `title`, `event_date`, `event_time`, `end_time`, `type`, `member_name`, `description`, `color`, `is_all_day`, `is_important`, `is_recurring`, `recurring_type`, `is_completed`, `completed_at`, `created_at`, `updated_at`) VALUES
(1, 1, 1, 'Family budget review', '2026-05-22', '19:00:00', '20:00:00', 'event', NULL, 'Review spending, wishlist priorities and next month plan.', '#198754', 0, 1, 0, 'none', 0, NULL, '2026-05-01 09:40:00', '2026-05-01 09:40:00'),
(2, 1, 1, 'Pay home bills', '2026-05-25', '10:00:00', NULL, 'reminder', NULL, 'Check electricity, internet and other regular payments.', '#0d6efd', 0, 1, 0, 'none', 0, NULL, '2026-05-01 09:40:00', '2026-05-01 09:40:00'),
(3, 1, 1, 'Course deadline', '2026-05-28', NULL, NULL, 'task', 'Demo Owner', 'Finish planned study task.', '#6f42c1', 1, 0, 0, 'none', 0, NULL, '2026-05-01 09:40:00', '2026-05-01 09:40:00'),
(4, 2, 1, 'Car service appointment', '2026-06-03', '14:30:00', '16:00:00', 'event', 'Demo Editor', 'Regular car check and service.', '#fd7e14', 0, 1, 0, 'none', 0, NULL, '2026-05-01 09:40:00', '2026-05-01 09:40:00'),
(5, 1, 1, 'Gift planning reminder', '2026-06-12', NULL, NULL, 'birthday', 'Family member', 'Prepare a small gift and dinner plan.', '#dc3545', 1, 1, 0, 'none', 0, NULL, '2026-05-01 09:40:00', '2026-05-01 09:40:00');

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
  `dashboard_featured` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Дамп данных таблицы `categories`
--

INSERT INTO `categories` (`id`, `user_id`, `family_id`, `name`, `type`, `color`, `icon`, `dashboard_featured`, `created_at`) VALUES
(1, 1, 1, 'Salary', 'income', '#16a34a', 'cash-stack', 1, '2026-05-01 09:20:00'),
(2, 1, 1, 'Freelance', 'income', '#06b6d4', 'laptop', 0, '2026-05-01 09:20:00'),
(3, 1, 1, 'Refunds', 'income', '#84cc16', 'piggy-bank', 0, '2026-05-01 09:20:00'),
(4, 1, 1, 'Groceries', 'expense', '#22c55e', 'basket', 1, '2026-05-01 09:20:00'),
(5, 1, 1, 'Transport', 'expense', '#3b82f6', 'car-front', 1, '2026-05-01 09:20:00'),
(6, 1, 1, 'Home Bills', 'expense', '#6366f1', 'house-door', 1, '2026-05-01 09:20:00'),
(7, 1, 1, 'Education', 'expense', '#8b5cf6', 'book', 0, '2026-05-01 09:20:00'),
(8, 1, 1, 'Health', 'expense', '#ef4444', 'heart-pulse', 0, '2026-05-01 09:20:00'),
(9, 1, 1, 'Entertainment', 'expense', '#f97316', 'controller', 0, '2026-05-01 09:20:00'),
(10, 1, 1, 'Wishlist', 'expense', '#64748b', 'gift', 0, '2026-05-01 09:20:00'),
(11, 2, 1, 'Side Income', 'income', '#0ea5e9', 'wallet2', 0, '2026-05-01 09:20:00'),
(12, 2, 1, 'Car Service', 'expense', '#0f766e', 'fuel-pump', 0, '2026-05-01 09:20:00');

-- --------------------------------------------------------

--
-- Структура таблицы `email_verification_tokens`
--

CREATE TABLE `email_verification_tokens` (
  `id` int(10) UNSIGNED NOT NULL,
  `user_id` int(10) UNSIGNED NOT NULL,
  `token_hash` varchar(255) NOT NULL,
  `expires_at` datetime NOT NULL,
  `used_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Структура таблицы `families`
--

CREATE TABLE `families` (
  `id` int(10) UNSIGNED NOT NULL,
  `name` varchar(100) NOT NULL,
  `avatar_url` varchar(500) DEFAULT NULL,
  `motto` varchar(140) DEFAULT NULL,
  `owner_user_id` int(10) UNSIGNED NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Дамп данных таблицы `families`
--

INSERT INTO `families` (`id`, `name`, `avatar_url`, `motto`, `owner_user_id`, `created_at`, `updated_at`) VALUES
(1, 'Demo Family', NULL, 'Plan, track, and save together.', 1, '2026-05-01 09:10:00', '2026-05-01 09:10:00');

-- --------------------------------------------------------

--
-- Структура таблицы `family_activity_logs`
--

CREATE TABLE `family_activity_logs` (
  `id` int(10) UNSIGNED NOT NULL,
  `family_id` int(10) UNSIGNED NOT NULL,
  `actor_user_id` int(10) UNSIGNED NOT NULL,
  `target_user_id` int(10) UNSIGNED DEFAULT NULL,
  `action` varchar(80) NOT NULL,
  `entity_type` varchar(80) NOT NULL DEFAULT 'family',
  `entity_id` int(10) UNSIGNED DEFAULT NULL,
  `description` varchar(1000) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Дамп данных таблицы `family_activity_logs`
--

INSERT INTO `family_activity_logs` (`id`, `family_id`, `actor_user_id`, `target_user_id`, `action`, `entity_type`, `entity_id`, `description`, `created_at`) VALUES
(1, 1, 1, NULL, 'family_created', 'family', 1, 'Demo Owner created the demo family workspace.', '2026-05-01 09:10:00'),
(2, 1, 1, 2, 'member_added', 'member', 2, 'Demo Editor was added to the family workspace.', '2026-05-01 09:15:00'),
(3, 1, 1, 3, 'member_added', 'member', 3, 'Demo Viewer was added to the family workspace.', '2026-05-01 09:18:00'),
(4, 1, 1, NULL, 'category_created', 'category', 4, 'Groceries category was added for shared expenses.', '2026-05-01 09:20:00'),
(5, 1, 1, NULL, 'transaction_created', 'transaction', 1, 'Monthly salary was recorded.', '2026-05-01 10:00:00'),
(6, 1, 2, NULL, 'wishlist_item_created', 'wishlist_item', 5, 'Car audio speakers were added to the wishlist.', '2026-05-01 09:35:00');

-- --------------------------------------------------------

--
-- Структура таблицы `family_members`
--

CREATE TABLE `family_members` (
  `id` int(10) UNSIGNED NOT NULL,
  `family_id` int(10) UNSIGNED NOT NULL,
  `user_id` int(10) UNSIGNED NOT NULL,
  `role` enum('owner','editor','viewer') NOT NULL DEFAULT 'viewer',
  `joined_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Дамп данных таблицы `family_members`
--

INSERT INTO `family_members` (`id`, `family_id`, `user_id`, `role`, `joined_at`, `updated_at`) VALUES
(1, 1, 1, 'owner', '2026-05-01 09:10:00', '2026-05-01 09:10:00'),
(2, 1, 2, 'editor', '2026-05-01 09:15:00', '2026-05-01 09:15:00'),
(3, 1, 3, 'viewer', '2026-05-01 09:18:00', '2026-05-01 09:18:00');

-- --------------------------------------------------------

--
-- Структура таблицы `password_reset_tokens`
--

CREATE TABLE `password_reset_tokens` (
  `id` int(10) UNSIGNED NOT NULL,
  `user_id` int(10) UNSIGNED NOT NULL,
  `token_hash` varchar(255) NOT NULL,
  `expires_at` datetime NOT NULL,
  `used_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
(1, 1, 1, 1, 'income', 1850.00, 'Monthly salary', '2026-05-01', 1, '2026-05-01 10:00:00'),
(2, 2, 1, 11, 'income', 420.00, 'Small freelance task', '2026-05-02', 2, '2026-05-02 10:00:00'),
(3, 1, 1, 4, 'expense', -64.35, 'Weekly supermarket shopping', '2026-05-03', 1, '2026-05-03 10:00:00'),
(4, 1, 1, 5, 'expense', -18.50, 'Public transport card top-up', '2026-05-04', 1, '2026-05-04 10:00:00'),
(5, 1, 1, 6, 'expense', -95.00, 'Electricity bill', '2026-05-05', 1, '2026-05-05 10:00:00'),
(6, 2, 1, 12, 'expense', -72.40, 'Fuel refill', '2026-05-06', 2, '2026-05-06 10:00:00'),
(7, 1, 1, 7, 'expense', -39.99, 'Online course materials', '2026-05-07', 1, '2026-05-07 10:00:00'),
(8, 1, 1, 8, 'expense', -24.70, 'Pharmacy purchase', '2026-05-08', 1, '2026-05-08 10:00:00'),
(9, 2, 1, 9, 'expense', -32.00, 'Family cinema evening', '2026-05-09', 2, '2026-05-09 10:00:00'),
(10, 1, 1, 3, 'income', 45.00, 'Returned order refund', '2026-05-10', 1, '2026-05-10 10:00:00'),
(11, 1, 1, 4, 'expense', -81.25, 'Weekend groceries', '2026-05-11', 1, '2026-05-11 10:00:00'),
(12, 2, 1, 5, 'expense', -14.00, 'Parking payment', '2026-05-12', 2, '2026-05-12 10:00:00'),
(13, 1, 1, 6, 'expense', -48.90, 'Internet payment', '2026-05-13', 1, '2026-05-13 10:00:00'),
(14, 1, 1, 2, 'income', 300.00, 'Landing page update', '2026-05-14', 1, '2026-05-14 10:00:00'),
(15, 1, 1, 10, 'expense', -119.99, 'Bought planned kitchen item', '2026-05-15', 1, '2026-05-15 10:00:00');

-- --------------------------------------------------------

--
-- Структура таблицы `users`
--

CREATE TABLE `users` (
  `id` int(10) UNSIGNED NOT NULL,
  `name` varchar(100) NOT NULL,
  `email` varchar(150) NOT NULL,
  `pending_email` varchar(150) DEFAULT NULL,
  `pending_email_token_hash` varchar(255) DEFAULT NULL,
  `pending_email_token_expires` datetime DEFAULT NULL,
  `avatar_url` varchar(255) DEFAULT NULL,
  `password_hash` varchar(255) NOT NULL,
  `email_verified_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Дамп данных таблицы `users`
--

INSERT INTO `users` (`id`, `name`, `email`, `pending_email`, `pending_email_token_hash`, `pending_email_token_expires`, `avatar_url`, `password_hash`, `email_verified_at`, `created_at`) VALUES
(1, 'Test Owner', 'admin@test.local', NULL, NULL, NULL, NULL, '$2b$12$9NoS4fpmnLf6AFu4A6qTLOyVe7b0w5C1zD0F3n9Brvl8a983qmDTG', '2026-05-01 09:00:00', '2026-05-01 09:00:00'),
(2, 'Test Editor', 'admin@myshop.local', NULL, NULL, NULL, NULL, '$2b$12$0ljJLZXnRWJb3.5O8Y6E5eU38uMCyXBOEdOcWWQ1BSPxmsRZMNOJy', '2026-05-01 09:05:00', '2026-05-01 09:05:00'),
(3, 'Test Viewer', 'viewer@test.local', NULL, NULL, NULL, NULL, '$2b$12$qKswsNhUGhyV9HHhvvzcZ.rB95ZuN546MwT3ARNa01i0xEja3YjsG', '2026-05-01 09:08:00', '2026-05-01 09:08:00');

-- --------------------------------------------------------

--
-- Структура таблицы `wishlist_folders`
--

CREATE TABLE `wishlist_folders` (
  `id` int(10) UNSIGNED NOT NULL,
  `user_id` int(10) UNSIGNED NOT NULL,
  `family_id` int(10) UNSIGNED DEFAULT NULL,
  `name` varchar(100) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Дамп данных таблицы `wishlist_folders`
--

INSERT INTO `wishlist_folders` (`id`, `user_id`, `family_id`, `name`, `created_at`) VALUES
(1, 1, 1, 'Education', '2026-05-01 09:30:00'),
(2, 1, 1, 'Home and Kitchen', '2026-05-01 09:30:00'),
(3, 2, 1, 'Car Setup', '2026-05-01 09:30:00'),
(4, 2, 1, 'Gaming Setup', '2026-05-01 09:30:00');

-- --------------------------------------------------------

--
-- Структура таблицы `wishlist_items`
--

CREATE TABLE `wishlist_items` (
  `id` int(10) UNSIGNED NOT NULL,
  `user_id` int(10) UNSIGNED NOT NULL,
  `family_id` int(10) UNSIGNED DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `folder` varchar(100) DEFAULT 'General',
  `status` enum('planned','postponed','bought','cancelled') NOT NULL DEFAULT 'planned',
  `description` varchar(1000) DEFAULT NULL,
  `product_url` varchar(1000) DEFAULT NULL,
  `image_url` varchar(1000) DEFAULT NULL,
  `desired_date` date DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Дамп данных таблицы `wishlist_items`
--

INSERT INTO `wishlist_items` (`id`, `user_id`, `family_id`, `title`, `amount`, `folder`, `status`, `description`, `product_url`, `image_url`, `desired_date`, `created_at`, `updated_at`) VALUES
(1, 1, 1, 'Development Laptop', 1199.00, 'Education', 'planned', 'Laptop for study, programming and diploma project work.', NULL, NULL, '2026-06-10', '2026-05-01 09:35:00', '2026-05-01 09:35:00'),
(2, 1, 1, 'JavaScript Architecture Book', 44.99, 'Education', 'planned', 'Book about application structure and maintainable code.', NULL, NULL, '2026-05-25', '2026-05-01 09:35:00', '2026-05-01 09:35:00'),
(3, 1, 1, 'Kitchen Air Fryer', 119.99, 'Home and Kitchen', 'bought', 'Small kitchen appliance for quick meals.', NULL, NULL, '2026-05-15', '2026-05-01 09:35:00', '2026-05-15 11:00:00'),
(4, 1, 1, 'Coffee Machine', 449.00, 'Home and Kitchen', 'postponed', 'Coffee machine for home use.', NULL, NULL, '2026-07-01', '2026-05-01 09:35:00', '2026-05-01 09:35:00'),
(5, 2, 1, 'Car Audio Speakers', 220.00, 'Car Setup', 'planned', 'Audio upgrade for the family car.', NULL, NULL, '2026-06-20', '2026-05-01 09:35:00', '2026-05-01 09:35:00'),
(6, 2, 1, 'Desk Monitor', 279.00, 'Gaming Setup', 'planned', 'Extra monitor for work and games.', NULL, NULL, '2026-06-05', '2026-05-01 09:35:00', '2026-05-01 09:35:00');

--
-- Индексы сохранённых таблиц
--

--
-- Индексы таблицы `calendar_events`
--
ALTER TABLE `calendar_events`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_calendar_events_user_date` (`user_id`,`event_date`),
  ADD KEY `idx_calendar_events_family_date` (`family_id`,`event_date`),
  ADD KEY `idx_calendar_events_user_date_new` (`user_id`,`event_date`),
  ADD KEY `idx_calendar_events_family_date_new` (`family_id`,`event_date`);

--
-- Индексы таблицы `categories`
--
ALTER TABLE `categories`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_categories_user` (`user_id`),
  ADD KEY `fk_categories_family` (`family_id`);

--
-- Индексы таблицы `email_verification_tokens`
--
ALTER TABLE `email_verification_tokens`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_email_verification_user` (`user_id`),
  ADD KEY `idx_email_verification_token_hash` (`token_hash`);

--
-- Индексы таблицы `families`
--
ALTER TABLE `families`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_families_owner` (`owner_user_id`);

--
-- Индексы таблицы `family_activity_logs`
--
ALTER TABLE `family_activity_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_family_activity_family` (`family_id`),
  ADD KEY `idx_family_activity_actor` (`actor_user_id`),
  ADD KEY `idx_family_activity_target` (`target_user_id`);

--
-- Индексы таблицы `family_members`
--
ALTER TABLE `family_members`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_family_user` (`family_id`,`user_id`),
  ADD KEY `fk_family_members_user` (`user_id`);

--
-- Индексы таблицы `password_reset_tokens`
--
ALTER TABLE `password_reset_tokens`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_password_reset_user` (`user_id`),
  ADD KEY `idx_password_reset_token_hash` (`token_hash`);

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
-- Индексы таблицы `wishlist_folders`
--
ALTER TABLE `wishlist_folders`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_wishlist_folder_scope` (`user_id`,`family_id`,`name`),
  ADD KEY `fk_wishlist_folders_user` (`user_id`),
  ADD KEY `fk_wishlist_folders_family` (`family_id`);

--
-- Индексы таблицы `wishlist_items`
--
ALTER TABLE `wishlist_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_wishlist_items_user` (`user_id`),
  ADD KEY `fk_wishlist_items_family` (`family_id`),
  ADD KEY `idx_wishlist_items_status` (`status`),
  ADD KEY `idx_wishlist_items_folder` (`folder`);

--
-- AUTO_INCREMENT для сохранённых таблиц
--

--
-- AUTO_INCREMENT для таблицы `calendar_events`
--
ALTER TABLE `calendar_events`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT для таблицы `categories`
--
ALTER TABLE `categories`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT для таблицы `email_verification_tokens`
--
ALTER TABLE `email_verification_tokens`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT для таблицы `families`
--
ALTER TABLE `families`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT для таблицы `family_activity_logs`
--
ALTER TABLE `family_activity_logs`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT для таблицы `family_members`
--
ALTER TABLE `family_members`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT для таблицы `password_reset_tokens`
--
ALTER TABLE `password_reset_tokens`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT для таблицы `transactions`
--
ALTER TABLE `transactions`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT для таблицы `users`
--
ALTER TABLE `users`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT для таблицы `wishlist_folders`
--
ALTER TABLE `wishlist_folders`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT для таблицы `wishlist_items`
--
ALTER TABLE `wishlist_items`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- Ограничения внешнего ключа сохраненных таблиц
--

--
-- Ограничения внешнего ключа таблицы `calendar_events`
--
ALTER TABLE `calendar_events`
  ADD CONSTRAINT `fk_calendar_events_family` FOREIGN KEY (`family_id`) REFERENCES `families` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_calendar_events_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Ограничения внешнего ключа таблицы `categories`
--
ALTER TABLE `categories`
  ADD CONSTRAINT `fk_categories_family` FOREIGN KEY (`family_id`) REFERENCES `families` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_categories_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Ограничения внешнего ключа таблицы `email_verification_tokens`
--
ALTER TABLE `email_verification_tokens`
  ADD CONSTRAINT `fk_email_verification_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Ограничения внешнего ключа таблицы `families`
--
ALTER TABLE `families`
  ADD CONSTRAINT `fk_families_owner` FOREIGN KEY (`owner_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Ограничения внешнего ключа таблицы `family_activity_logs`
--
ALTER TABLE `family_activity_logs`
  ADD CONSTRAINT `fk_family_activity_actor` FOREIGN KEY (`actor_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_family_activity_family` FOREIGN KEY (`family_id`) REFERENCES `families` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_family_activity_target` FOREIGN KEY (`target_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Ограничения внешнего ключа таблицы `family_members`
--
ALTER TABLE `family_members`
  ADD CONSTRAINT `fk_family_members_family` FOREIGN KEY (`family_id`) REFERENCES `families` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_family_members_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Ограничения внешнего ключа таблицы `password_reset_tokens`
--
ALTER TABLE `password_reset_tokens`
  ADD CONSTRAINT `fk_password_reset_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Ограничения внешнего ключа таблицы `transactions`
--
ALTER TABLE `transactions`
  ADD CONSTRAINT `fk_transactions_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_transactions_family` FOREIGN KEY (`family_id`) REFERENCES `families` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_transactions_paid_by_user` FOREIGN KEY (`paid_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_transactions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Ограничения внешнего ключа таблицы `wishlist_folders`
--
ALTER TABLE `wishlist_folders`
  ADD CONSTRAINT `fk_wishlist_folders_family` FOREIGN KEY (`family_id`) REFERENCES `families` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_wishlist_folders_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Ограничения внешнего ключа таблицы `wishlist_items`
--
ALTER TABLE `wishlist_items`
  ADD CONSTRAINT `fk_wishlist_items_family` FOREIGN KEY (`family_id`) REFERENCES `families` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_wishlist_items_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
