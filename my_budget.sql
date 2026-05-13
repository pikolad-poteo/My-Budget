-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Хост: 127.0.0.1
-- Время создания: Май 13 2026 г., 17:41
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
(1, 1, 1, 'Pay personal subscription', '2026-05-15', '10:00:00', NULL, 'reminder', NULL, 'Check monthly subscriptions and cancel unused services.', '#0d6efd', 0, 1, 0, 'none', 0, NULL, '2026-05-08 08:01:22', '2026-05-11 18:44:22'),
(2, 1, 1, 'Family budget review', '2026-05-18', '19:00:00', NULL, 'event', NULL, 'Review family expenses and wishlist priorities.', '#198754', 0, 1, 0, 'none', 0, NULL, '2026-05-08 08:01:22', '2026-05-09 19:54:07'),
(3, 1, 1, 'Course deadline', '2026-05-22', NULL, NULL, 'task', NULL, 'Finish planned study task.', '#6f42c1', 1, 0, 0, 'none', 0, NULL, '2026-05-08 08:01:22', '2026-05-11 18:44:22'),
(4, 2, 1, 'Car audio installation', '2026-05-25', '14:30:00', NULL, 'event', 'Vladislav', 'Install and test new audio components.', '#fd7e14', 0, 1, 0, 'none', 0, '2026-05-09 20:00:51', '2026-05-08 08:01:22', '2026-05-09 20:00:51'),
(5, 1, 1, 'Birthday reminder', '2026-06-02', NULL, NULL, 'birthday', 'Family member', 'Prepare small gift and dinner plan.', '#dc3545', 1, 1, 0, 'none', 0, NULL, '2026-05-08 08:01:22', '2026-05-09 19:54:07'),
(6, 2, 1, 'Europa Päev', '2026-05-09', NULL, NULL, 'event', NULL, NULL, '#0d6efd', 1, 0, 0, 'none', 0, NULL, '2026-05-09 20:01:35', '2026-05-09 20:34:54');

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
(1, 1, 1, 'Groceries', 'expense', '#22c55e', 'basket', 0, '2026-05-08 08:01:22'),
(2, 1, 1, 'Transport', 'expense', '#3b82f6', 'car-front', 0, '2026-05-08 08:01:22'),
(3, 1, 1, 'Coffee', 'expense', '#a16207', 'cup-hot', 1, '2026-05-08 08:01:22'),
(4, 1, 1, 'Shopping', 'expense', '#ec4899', 'bag', 0, '2026-05-08 08:01:22'),
(5, 1, 1, 'Health', 'expense', '#ef4444', 'heart-pulse', 0, '2026-05-08 08:01:22'),
(6, 1, 1, 'Education', 'expense', '#8b5cf6', 'book', 0, '2026-05-08 08:01:22'),
(7, 1, 1, 'Entertainment', 'expense', '#f97316', 'controller', 0, '2026-05-08 08:01:22'),
(8, 1, 1, 'Subscriptions', 'expense', '#64748b', 'credit-card', 0, '2026-05-08 08:01:22'),
(9, 1, 1, 'Salary', 'income', '#16a34a', 'cash-stack', 0, '2026-05-08 08:01:22'),
(10, 1, 1, 'Freelance', 'income', '#06b6d4', 'laptop', 0, '2026-05-08 08:01:22'),
(11, 1, 1, 'Refund', 'income', '#84cc16', 'arrow-counterclockwise', 0, '2026-05-08 08:01:22'),
(12, 1, 1, 'Gift', 'income', '#f59e0b', 'gift', 0, '2026-05-08 08:01:22'),
(13, 1, 1, 'Home Bills', 'expense', '#6366f1', 'house', 0, '2026-05-08 08:01:22'),
(14, 1, 1, 'Family Food', 'expense', '#10b981', 'cart', 0, '2026-05-08 08:01:22'),
(15, 1, 1, 'Kids', 'expense', '#f59e0b', 'emoji-smile', 0, '2026-05-08 08:01:22'),
(16, 1, 1, 'Car Service', 'expense', '#0f766e', 'tag', 0, '2026-05-08 08:01:22'),
(17, 1, 1, 'Family Income', 'income', '#8b5cf6', 'piggy-bank', 0, '2026-05-08 08:01:22'),
(18, 1, 1, 'Shared Refund', 'income', '#65a30d', 'wallet2', 0, '2026-05-08 08:01:22'),
(19, 2, 1, 'Bank', 'income', '#2563eb', 'bank', 0, '2026-05-08 08:01:22'),
(20, 2, 1, 'Car Audio', 'expense', '#7c3aed', 'tag', 0, '2026-05-08 08:01:22'),
(21, 2, 1, 'Family Groceries', 'expense', '#22c55e', 'basket2', 0, '2026-05-08 08:01:22'),
(22, 2, 1, 'Shared Salary', 'income', '#16a34a', 'cash', 0, '2026-05-08 08:01:22');

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

--
-- Дамп данных таблицы `email_verification_tokens`
--

INSERT INTO `email_verification_tokens` (`id`, `user_id`, `token_hash`, `expires_at`, `used_at`, `created_at`) VALUES
(2, 7, '182934414358eaafce72208eab4f3dc79a55ced9a2b0b3c27272597564e1acc7', '2026-05-14 14:44:54', NULL, '2026-05-13 11:44:54'),
(6, 11, '6e7d7466ce70628c43294fb33ff521cdb8cad038551881b2a2692b231ec842a2', '2026-05-14 17:55:44', '2026-05-13 17:56:25', '2026-05-13 14:55:44');

-- --------------------------------------------------------

--
-- Структура таблицы `families`
--

CREATE TABLE `families` (
  `id` int(10) UNSIGNED NOT NULL,
  `name` varchar(100) NOT NULL,
  `avatar_url` varchar(500) DEFAULT NULL,
  `owner_user_id` int(10) UNSIGNED NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Дамп данных таблицы `families`
--

INSERT INTO `families` (`id`, `name`, `avatar_url`, `owner_user_id`, `created_at`, `updated_at`) VALUES
(1, 'Dudins', '/uploads/family/family-1778686006773-878607758.jpg', 1, '2026-04-21 15:24:14', '2026-05-13 15:26:46');

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
(1, 1, 1, 1, 'member_existing', 'member', 1, 'Test is an existing family member with role viewer.', '2026-05-10 12:23:11'),
(2, 1, 2, 2, 'member_existing', 'member', 2, 'Test2 is an existing family member with role viewer.', '2026-05-10 12:23:11'),
(4, 1, 1, NULL, 'family_avatar_updated', 'family', 1, 'Updated family avatar.', '2026-05-10 12:52:29'),
(5, 1, 1, NULL, 'member_role_updated', 'member', 3, 'Changed Vladislav role from owner to editor.', '2026-05-10 12:53:05'),
(6, 1, 1, NULL, 'family_name_updated', 'family', 1, 'Changed family name from \"Dudins\" to \"Dudin\".', '2026-05-10 12:53:20'),
(7, 1, 1, NULL, 'family_name_updated', 'family', 1, 'Changed family name from \"Dudin\" to \"Dudins\".', '2026-05-10 12:53:25'),
(8, 1, 1, NULL, 'member_role_updated', 'member', 3, 'Changed Vladislav role from editor to owner.', '2026-05-10 15:50:36'),
(9, 1, 1, NULL, 'member_role_updated', 'member', 3, 'Changed Vladislav role from owner to editor.', '2026-05-10 15:50:37'),
(10, 1, 1, NULL, 'member_role_updated', 'member', 3, 'Changed Vladislav role from editor to owner.', '2026-05-10 15:50:38'),
(11, 1, 1, NULL, 'member_role_updated', 'member', 3, 'Changed Vladislav role from owner to editor.', '2026-05-10 15:50:39'),
(12, 1, 1, NULL, 'member_role_updated', 'member', 3, 'Changed Vladislav role from editor to viewer.', '2026-05-10 15:50:40'),
(13, 1, 1, 2, 'member_role_updated', 'member', 2, 'Changed Test2 role from viewer to editor.', '2026-05-10 15:50:40'),
(14, 1, 1, 2, 'member_role_updated', 'member', 2, 'Changed Test2 role from editor to viewer.', '2026-05-10 15:50:43'),
(15, 1, 1, NULL, 'member_role_updated', 'member', 3, 'Changed Vladislav role from viewer to editor.', '2026-05-10 15:50:45'),
(16, 1, 1, NULL, 'member_role_updated', 'member', 3, 'Changed Vladislav role from editor to owner.', '2026-05-10 15:54:31'),
(17, 1, 1, NULL, 'member_role_updated', 'member', 3, 'Changed Vladislav role from owner to editor.', '2026-05-10 15:54:32'),
(18, 1, 1, 2, 'member_role_updated', 'member', 2, 'Changed Test2 role from viewer to owner.', '2026-05-10 16:05:04'),
(19, 1, 1, 2, 'member_role_updated', 'member', 2, 'Changed Test2 role from owner to viewer.', '2026-05-10 16:05:12'),
(20, 1, 1, NULL, 'family_name_updated', 'family', 1, 'Changed family name from \"Dudins\" to \"Dudinsыыы\".', '2026-05-10 16:56:46'),
(21, 1, 1, NULL, 'family_name_updated', 'family', 1, 'Changed family name from \"Dudinsыыы\" to \"Dudinssss\".', '2026-05-10 16:56:50'),
(22, 1, 1, NULL, 'family_name_updated', 'family', 1, 'Changed family name from \"Dudinssss\" to \"Dudins\".', '2026-05-10 16:56:52'),
(23, 1, 1, NULL, 'member_role_updated', 'member', 3, 'Changed Vladislav role from editor to viewer.', '2026-05-10 16:59:40'),
(24, 1, 1, 2, 'member_role_updated', 'member', 2, 'Changed Test2 role from viewer to editor.', '2026-05-10 16:59:42'),
(25, 1, 1, NULL, 'family_avatar_updated', 'family', 1, 'Updated family avatar.', '2026-05-10 16:59:54'),
(26, 1, 1, NULL, 'family_avatar_updated', 'family', 1, 'Updated family avatar.', '2026-05-10 17:00:03'),
(27, 1, 1, NULL, 'family_avatar_updated', 'family', 1, 'Updated family avatar.', '2026-05-10 17:00:37'),
(28, 1, 1, NULL, 'family_name_updated', 'family', 1, 'Changed family name from \"Dudins\" to \"Vladislav\".', '2026-05-11 11:50:24'),
(29, 1, 1, NULL, 'family_name_updated', 'family', 1, 'Changed family name from \"Vladislav\" to \"Dudins\".', '2026-05-11 11:50:29'),
(30, 1, 1, NULL, 'family_avatar_updated', 'family', 1, 'Updated family avatar.', '2026-05-11 11:54:39'),
(31, 1, 2, NULL, 'family_avatar_updated', 'family', 1, 'Removed family avatar.', '2026-05-11 12:06:26'),
(32, 1, 1, NULL, 'family_avatar_updated', 'family', 1, 'Updated family avatar.', '2026-05-11 12:08:59'),
(33, 1, 1, NULL, 'family_avatar_updated', 'family', 1, 'Removed family avatar.', '2026-05-11 12:09:03'),
(34, 1, 1, NULL, 'family_avatar_updated', 'family', 1, 'Updated family avatar.', '2026-05-11 12:26:54'),
(35, 1, 1, NULL, 'family_avatar_updated', 'family', 1, 'Removed family avatar.', '2026-05-11 12:26:56'),
(36, 1, 1, NULL, 'family_avatar_updated', 'family', 1, 'Updated family avatar.', '2026-05-11 12:37:25'),
(37, 1, 1, NULL, 'family_avatar_updated', 'family', 1, 'Removed family avatar.', '2026-05-11 12:37:32'),
(38, 1, 1, NULL, 'family_avatar_updated', 'family', 1, 'Updated family avatar.', '2026-05-11 12:37:40'),
(39, 1, 2, NULL, 'family_avatar_updated', 'family', 1, 'Removed family avatar.', '2026-05-11 12:39:16'),
(40, 1, 2, NULL, 'family_avatar_updated', 'family', 1, 'Updated family avatar.', '2026-05-11 12:39:20'),
(41, 1, 1, NULL, 'family_name_updated', 'family', 1, 'Changed family name from \"Dudins\" to \"Dudinss\".', '2026-05-11 12:47:35'),
(42, 1, 1, NULL, 'family_name_updated', 'family', 1, 'Changed family name from \"Dudinss\" to \"Dudins\".', '2026-05-11 12:47:36'),
(43, 1, 1, NULL, 'family_avatar_updated', 'family', 1, 'Removed family avatar.', '2026-05-11 12:47:37'),
(44, 1, 1, NULL, 'family_avatar_updated', 'family', 1, 'Updated family avatar.', '2026-05-11 12:47:46'),
(45, 1, 2, NULL, 'family_avatar_updated', 'family', 1, 'Removed family avatar.', '2026-05-11 12:49:34'),
(46, 1, 2, NULL, 'family_avatar_updated', 'family', 1, 'Updated family avatar.', '2026-05-11 12:49:39'),
(47, 1, 1, NULL, 'member_removed', 'member', 3, 'Removed Vladislav from the family.', '2026-05-11 12:50:48'),
(48, 1, 1, NULL, 'member_added', 'member', 3, 'Added Vladislav as viewer.', '2026-05-11 12:50:54'),
(49, 1, 1, NULL, 'family_avatar_updated', 'family', 1, 'Removed family avatar.', '2026-05-11 12:51:58'),
(50, 1, 1, NULL, 'family_avatar_updated', 'family', 1, 'Updated family avatar.', '2026-05-11 12:52:03'),
(51, 1, 1, NULL, 'family_avatar_updated', 'family', 1, 'Removed family avatar.', '2026-05-11 12:52:06'),
(52, 1, 1, NULL, 'family_avatar_updated', 'family', 1, 'Updated family avatar.', '2026-05-11 13:14:33'),
(53, 1, 1, NULL, 'family_avatar_updated', 'family', 1, 'Removed family avatar.', '2026-05-11 13:14:55'),
(54, 1, 1, NULL, 'family_avatar_updated', 'family', 1, 'Updated family avatar.', '2026-05-11 13:38:10'),
(55, 1, 1, NULL, 'family_avatar_updated', 'family', 1, 'Updated family avatar.', '2026-05-11 15:02:05'),
(56, 1, 1, NULL, 'family_avatar_updated', 'family', 1, 'Updated family avatar.', '2026-05-11 15:02:25'),
(57, 1, 1, NULL, 'family_avatar_updated', 'family', 1, 'Removed family avatar.', '2026-05-11 17:41:19'),
(58, 1, 1, NULL, 'family_name_updated', 'family', 1, 'Changed family name from \"Dudins\" to \"Dudinss\".', '2026-05-11 17:41:48'),
(59, 1, 1, NULL, 'family_name_updated', 'family', 1, 'Changed family name from \"Dudinss\" to \"Dudins\".', '2026-05-11 17:41:50'),
(60, 1, 1, NULL, 'family_avatar_updated', 'family', 1, 'Updated family avatar.', '2026-05-11 18:31:37'),
(61, 1, 1, NULL, 'family_avatar_updated', 'family', 1, 'Removed family avatar.', '2026-05-11 18:32:00'),
(62, 1, 1, NULL, 'family_avatar_updated', 'family', 1, 'Updated family avatar.', '2026-05-11 18:33:02'),
(63, 1, 1, NULL, 'family_avatar_updated', 'family', 1, 'Removed family avatar.', '2026-05-11 18:35:40'),
(64, 1, 1, NULL, 'member_removed', 'member', 3, 'Removed Dasha from the family.', '2026-05-11 18:49:37'),
(65, 1, 1, NULL, 'member_added', 'member', 3, 'Added Dasha as viewer.', '2026-05-11 18:55:03'),
(67, 1, 1, NULL, 'member_added', 'member', 3, 'Added Dasha as viewer.', '2026-05-11 18:56:27'),
(68, 1, 2, NULL, 'family_avatar_updated', 'family', 1, 'Updated family avatar.', '2026-05-11 18:59:47'),
(69, 1, 2, NULL, 'family_avatar_updated', 'family', 1, 'Removed family avatar.', '2026-05-11 18:59:49'),
(70, 1, 1, NULL, 'member_removed', 'member', 3, 'Removed Dasha from the family.', '2026-05-11 19:00:23'),
(75, 1, 1, NULL, 'member_added', 'member', 4, 'Added Dasha as viewer.', '2026-05-11 19:08:50'),
(76, 1, 1, NULL, 'member_removed', 'member', 4, 'Removed Dasha from the family.', '2026-05-11 19:12:05'),
(82, 1, 1, NULL, 'member_added', 'member', 5, 'Added Dasha as viewer.', '2026-05-11 19:23:42'),
(83, 1, 1, NULL, 'family_avatar_updated', 'family', 1, 'Updated family avatar.', '2026-05-11 19:54:50'),
(84, 1, 1, NULL, 'member_removed', 'member', 5, 'Removed Dasha from the family.', '2026-05-11 19:56:51'),
(87, 1, 1, NULL, 'member_added', 'member', 5, 'Added Dasha as viewer.', '2026-05-11 19:59:54'),
(88, 1, 1, NULL, 'family_avatar_updated', 'family', 1, 'Removed family avatar.', '2026-05-11 20:27:35'),
(89, 1, 1, NULL, 'member_removed', 'member', 5, 'Removed Dasha from the family.', '2026-05-12 06:55:09'),
(92, 1, 1, NULL, 'member_added', 'member', 5, 'Added Dasha as viewer.', '2026-05-12 14:43:23'),
(93, 1, 1, NULL, 'member_removed', 'member', 5, 'Removed Dasha from the family.', '2026-05-12 15:12:42'),
(94, 1, 1, NULL, 'family_avatar_updated', 'family', 1, 'Updated family avatar.', '2026-05-13 15:00:26'),
(95, 1, 1, NULL, 'family_avatar_updated', 'family', 1, 'Removed family avatar.', '2026-05-13 15:02:37'),
(96, 1, 2, NULL, 'family_avatar_updated', 'family', 1, 'Updated family avatar.', '2026-05-13 15:26:46');

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
(2, 1, 1, 'owner', '2026-04-21 15:24:26', '2026-05-10 12:41:35'),
(3, 1, 2, 'editor', '2026-04-21 15:25:16', '2026-05-10 16:59:42');

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

--
-- Дамп данных таблицы `password_reset_tokens`
--

INSERT INTO `password_reset_tokens` (`id`, `user_id`, `token_hash`, `expires_at`, `used_at`, `created_at`) VALUES
(3, 11, 'eba389b4b161a75ccd3bd675b254186dc3eeaa42777ba92c10653a9b13561523', '2026-05-13 18:27:42', '2026-05-13 17:58:12', '2026-05-13 14:57:42'),
(5, 11, '0801db18b9e1734baf9f292ac01ba05e0b41568b1caccdaf2f2d592a877cb32d', '2026-05-13 19:08:55', '2026-05-13 18:39:51', '2026-05-13 15:38:55');

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
(1, 1, 1, 9, 'income', 1850.00, 'Monthly salary', '2026-05-01', 1, '2026-05-08 08:01:22'),
(2, 1, 1, 1, 'expense', -54.35, 'Weekly supermarket shopping', '2026-05-02', 1, '2026-05-08 08:01:22'),
(3, 1, 1, 2, 'expense', -2.50, 'Bus ticket', '2026-05-02', 1, '2026-05-08 08:01:22'),
(4, 1, 1, 3, 'expense', -4.80, 'Morning coffee', '2026-05-03', 1, '2026-05-08 08:01:22'),
(5, 1, 1, 4, 'expense', -89.99, 'New jeans', '2026-05-04', 1, '2026-05-08 08:01:22'),
(6, 1, 1, 10, 'income', 320.00, 'Small landing page task', '2026-05-05', 1, '2026-05-08 08:01:22'),
(7, 1, 1, 5, 'expense', -18.20, 'Pharmacy purchase', '2026-05-05', 1, '2026-05-08 08:01:22'),
(8, 1, 1, 6, 'expense', -39.99, 'Online course materials', '2026-05-06', 1, '2026-05-08 08:01:22'),
(9, 1, 1, 7, 'expense', -14.50, 'Cinema ticket', '2026-05-07', 1, '2026-05-08 08:01:22'),
(10, 1, 1, 8, 'expense', -9.99, 'Music subscription', '2026-05-08', 1, '2026-05-08 08:01:22'),
(11, 1, 1, 11, 'income', 24.90, 'Returned order refund', '2026-05-08', 1, '2026-05-08 08:01:22'),
(12, 1, 1, 12, 'income', 50.00, 'Birthday gift', '2026-05-09', 1, '2026-05-08 08:01:22'),
(13, 1, 1, 1, 'expense', -41.10, 'Fresh food market', '2026-05-10', 1, '2026-05-08 08:01:22'),
(14, 1, 1, 2, 'expense', -16.00, 'Taxi ride', '2026-05-11', 1, '2026-05-08 08:01:22'),
(15, 1, 1, 3, 'expense', -6.20, 'Coffee with colleague', '2026-05-12', 1, '2026-05-08 08:01:22'),
(16, 1, 1, 4, 'expense', -129.00, 'Spring clothes order', '2026-05-13', 1, '2026-05-08 08:01:22'),
(17, 1, 1, 5, 'expense', -32.70, 'Vitamins', '2026-05-14', 1, '2026-05-08 08:01:22'),
(18, 1, 1, 6, 'expense', -12.99, 'Programming book discount', '2026-05-15', 1, '2026-05-08 08:01:22'),
(19, 1, 1, 7, 'expense', -59.99, 'Game purchase', '2026-05-16', 1, '2026-05-08 08:01:22'),
(20, 1, 1, 8, 'expense', -14.99, 'Cloud storage', '2026-05-17', 1, '2026-05-08 08:01:22'),
(21, 1, 1, 13, 'expense', -95.00, 'Electricity bill', '2026-05-03', 1, '2026-05-08 08:01:22'),
(22, 1, 1, 14, 'expense', -88.60, 'Family dinner groceries', '2026-05-04', 1, '2026-05-08 08:01:22'),
(23, 1, 1, 15, 'expense', -41.30, 'School supplies', '2026-05-05', 1, '2026-05-08 08:01:22'),
(24, 1, 1, 16, 'expense', -210.00, 'Car service deposit', '2026-05-06', 1, '2026-05-08 08:01:22'),
(25, 1, 1, 17, 'income', 300.00, 'Shared cashback', '2026-05-07', 1, '2026-05-08 08:01:22'),
(26, 1, 1, 18, 'income', 37.50, 'Family refund', '2026-05-08', 1, '2026-05-08 08:01:22'),
(27, 1, 1, 13, 'expense', -47.50, 'Internet payment', '2026-05-09', 1, '2026-05-08 08:01:22'),
(28, 1, 1, 14, 'expense', -64.25, 'Weekend family groceries', '2026-05-10', 1, '2026-05-08 08:01:22'),
(29, 1, 1, 15, 'expense', -27.00, 'Kids entertainment', '2026-05-11', 1, '2026-05-08 08:01:22'),
(30, 1, 1, 16, 'expense', -72.40, 'Fuel refill', '2026-05-12', 1, '2026-05-08 08:01:22'),
(31, 2, 1, 19, 'income', 1275.00, 'Bank transfer income', '2026-05-01', 2, '2026-05-08 08:01:22'),
(32, 2, 1, 20, 'expense', -349.00, 'Car amplifier', '2026-05-02', 2, '2026-05-08 08:01:22'),
(33, 2, 1, 20, 'expense', -89.99, 'Audio cables', '2026-05-03', 2, '2026-05-08 08:01:22'),
(34, 2, 1, 21, 'expense', -55.40, 'Shared groceries', '2026-05-04', 2, '2026-05-08 08:01:22'),
(35, 2, 1, 22, 'income', 410.00, 'Shared salary part', '2026-05-05', 2, '2026-05-08 08:01:22'),
(36, 2, 1, 20, 'expense', -129.00, NULL, '2026-05-06', 2, '2026-05-08 08:01:22'),
(37, 2, 1, 21, 'expense', -22.75, 'Milk and bread', '2026-05-07', 2, '2026-05-08 08:01:22'),
(38, 2, 1, 19, 'income', 18.79, 'Small bank interest', '2026-05-08', 2, '2026-05-08 08:01:22'),
(39, 1, 1, 1, 'expense', -61.75, 'April grocery refill', '2026-04-18', 1, '2026-05-08 08:01:22'),
(40, 1, 1, 9, 'income', 1850.00, 'April salary', '2026-04-01', 1, '2026-05-08 08:01:22'),
(41, 1, 1, 13, 'expense', -500.00, 'March rent part', '2026-03-20', 1, '2026-05-08 08:01:22'),
(42, 1, 1, 17, 'income', 120.00, 'March shared income', '2026-03-22', 1, '2026-05-08 08:01:22'),
(43, 2, 1, 20, 'expense', -200.00, 'Old speaker test', '2026-03-31', 2, '2026-05-08 08:01:22'),
(44, 2, 1, 21, 'expense', -120.00, 'Family shopping test', '2026-03-19', 2, '2026-05-08 08:01:22'),
(49, 1, 1, 5, 'expense', -5.00, NULL, '2026-05-12', 1, '2026-05-12 15:33:40'),
(51, 1, 1, 4, 'expense', -1000.00, NULL, '2026-05-12', 1, '2026-05-12 16:53:21'),
(53, 1, 1, 14, 'expense', -15.00, NULL, '2026-05-12', 1, '2026-05-12 16:59:48'),
(56, 1, 1, 10, 'income', 2650.00, NULL, '2026-05-12', 1, '2026-05-12 17:15:45');

-- --------------------------------------------------------

--
-- Структура таблицы `users`
--

CREATE TABLE `users` (
  `id` int(10) UNSIGNED NOT NULL,
  `name` varchar(100) NOT NULL,
  `email` varchar(150) NOT NULL,
  `avatar_url` varchar(255) DEFAULT NULL,
  `password_hash` varchar(255) NOT NULL,
  `email_verified_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Дамп данных таблицы `users`
--

INSERT INTO `users` (`id`, `name`, `email`, `avatar_url`, `password_hash`, `email_verified_at`, `created_at`) VALUES
(1, 'Violetta Owner', 'admin@test.local', '/uploads/users/user-1778685921308-475980989.jpg', '$2b$12$5aM3bgCJallq9mFnBRX4GevYL6vEo3tS0KV6.biyzZPeZP2.c2X0a', '2026-05-13 13:52:08', '2026-04-21 14:59:58'),
(2, 'Vladislav Editor', 'admin@myshop.local', '/uploads/users/user-1778685989169-127043073.jpg', '$2b$12$BMY1nYu6lMflJP8hsLZ4RuUR1zpZi4M9vrjWbfnoiIhxzY52a7M1C', '2026-05-13 13:52:08', '2026-04-21 15:05:23'),
(7, 'Vanessa', 'pikoladgame@gmail.com', NULL, '$2b$12$4cp/IzXvifhGWAOXmq5pwehdQtmJECNfpsE0qOjzWklCBpEMLedkW', NULL, '2026-05-13 11:44:54'),
(11, 'Dasha', 'pikoladgame2004@gmail.com', '/uploads/users/user-1778686038755-244995832.jpg', '$2b$12$Xq5.PvLRDBeZDkhoJc0zOOSc6jOQqmR8gQVYqLhXCxVRSBPQrK656', '2026-05-13 17:56:25', '2026-05-13 14:55:44');

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
(1, 1, 1, 'General', '2026-05-08 08:01:22'),
(2, 1, 1, 'Education', '2026-05-08 08:01:22'),
(3, 1, 1, 'Clothes', '2026-05-08 08:01:22'),
(4, 1, 1, 'Home and Kitchen', '2026-05-08 08:01:22'),
(5, 1, 1, 'Gaming Setup', '2026-05-08 08:01:22'),
(6, 1, 1, 'Very Long Folder Name For Layout Testing', '2026-05-08 08:01:22'),
(7, 2, 1, 'Noortehnik', '2026-05-08 08:01:22'),
(8, 2, 1, 'Car Audio', '2026-05-08 08:01:22'),
(9, 2, 1, 'Clothes', '2026-05-08 08:01:22');

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
(1, 1, 1, 'MacBook Air for Study', 1199.00, 'Education', 'planned', 'Laptop for university, development and diploma work.', 'https://example.com/macbook-air', 'https://dummyimage.com/900x600/e5e7eb/111827.png&text=MacBook+Air', '2026-06-10', '2026-05-08 08:01:22', '2026-05-08 08:01:22'),
(2, 1, 1, 'JavaScript Architecture Book', 44.99, 'Education', 'planned', 'Book about modern JavaScript architecture and frontend patterns.', 'https://example.com/javascript-book', 'https://dummyimage.com/900x600/e5e7eb/111827.png&text=JavaScript+Book', '2026-05-20', '2026-05-08 08:01:22', '2026-05-11 19:51:50'),
(3, 1, 1, 'SQL Practice Platform', 19.99, 'Education', 'bought', 'Monthly subscription for SQL practice tasks.', 'https://example.com/sql-practice', 'https://dummyimage.com/900x600/e5e7eb/111827.png&text=SQL+Practice', '2026-05-12', '2026-05-08 08:01:22', '2026-05-08 08:01:22'),
(4, 1, 1, 'English Speaking Course', 149.00, 'Education', 'postponed', 'Course for improving speaking practice.', 'https://example.com/english-course', 'https://dummyimage.com/900x600/e5e7eb/111827.png&text=English+Course', '2026-08-15', '2026-05-08 08:01:22', '2026-05-08 08:01:22'),
(5, 1, 1, 'Running Shoes', 139.99, 'Clothes', 'planned', 'Comfortable shoes for walking and running.', 'https://example.com/running-shoes', 'https://dummyimage.com/900x600/e5e7eb/111827.png&text=Running+Shoes', '2026-06-05', '2026-05-08 08:01:22', '2026-05-08 08:01:22'),
(6, 1, 1, 'Winter Jacket', 189.00, 'Clothes', 'postponed', 'Warm jacket for next winter season.', 'https://example.com/winter-jacket', 'https://dummyimage.com/900x600/e5e7eb/111827.png&text=Winter+Jacket', '2026-10-01', '2026-05-08 08:01:22', '2026-05-08 08:01:22'),
(7, 1, 1, 'Classic Hoodie', 49.99, 'Clothes', 'bought', 'Basic hoodie for everyday use.', 'https://example.com/hoodie', 'https://dummyimage.com/900x600/e5e7eb/111827.png&text=Classic+Hoodie', '2026-05-18', '2026-05-08 08:01:22', '2026-05-08 08:01:22'),
(8, 1, 1, 'Backpack for Laptop', 74.99, 'Clothes', 'planned', 'Backpack with laptop pocket and simple design.', 'https://example.com/backpack', 'https://dummyimage.com/900x600/e5e7eb/111827.png&text=Laptop+Backpack', '2026-06-01', '2026-05-08 08:01:22', '2026-05-08 08:01:22'),
(9, 1, 1, 'Coffee Machine', 449.00, 'Home and Kitchen', 'planned', 'Coffee machine for home use.', 'https://example.com/coffee-machine', 'https://dummyimage.com/900x600/e5e7eb/111827.png&text=Coffee+Machine', '2026-06-25', '2026-05-08 08:01:22', '2026-05-08 08:01:22'),
(10, 1, 1, 'Air Fryer', 119.99, 'Home and Kitchen', 'planned', 'Air fryer for quick meals.', 'https://example.com/air-fryer', 'https://dummyimage.com/900x600/e5e7eb/111827.png&text=Air+Fryer', '2026-05-28', '2026-05-08 08:01:22', '2026-05-08 08:01:22'),
(11, 1, 1, 'Chef Knife', 64.99, 'Home and Kitchen', 'bought', 'Good kitchen knife for daily cooking.', 'https://example.com/chef-knife', 'https://dummyimage.com/900x600/e5e7eb/111827.png&text=Chef+Knife', '2026-05-09', '2026-05-08 08:01:22', '2026-05-08 08:01:22'),
(12, 1, 1, 'Cutting Board Set', 22.99, 'Home and Kitchen', 'cancelled', 'Set of cutting boards.', 'https://example.com/cutting-board', 'https://dummyimage.com/900x600/e5e7eb/111827.png&text=Cutting+Boards', NULL, '2026-05-08 08:01:22', '2026-05-08 08:01:22'),
(13, 1, 1, 'Gaming Monitor 27 inch', 299.99, 'Gaming Setup', 'planned', 'Monitor for games, coding and design review.', 'https://example.com/gaming-monitor', 'https://dummyimage.com/900x600/e5e7eb/111827.png&text=Gaming+Monitor', '2026-06-08', '2026-05-08 08:01:22', '2026-05-08 08:01:22'),
(14, 1, 1, 'Mechanical Keyboard', 129.99, 'Gaming Setup', 'planned', 'Mechanical keyboard for coding.', 'https://example.com/mechanical-keyboard', 'https://dummyimage.com/900x600/e5e7eb/111827.png&text=Mechanical+Keyboard', '2026-05-25', '2026-05-08 08:01:22', '2026-05-08 08:01:22'),
(15, 1, 1, 'Gaming Chair', 219.00, 'Gaming Setup', 'postponed', 'Chair for long work and gaming sessions.', 'https://example.com/gaming-chair', 'https://dummyimage.com/900x600/e5e7eb/111827.png&text=Gaming+Chair', '2026-09-01', '2026-05-08 08:01:22', '2026-05-08 08:01:22'),
(16, 1, 1, 'Controller Charging Station', 29.99, 'Gaming Setup', 'planned', 'Charging station for controllers.', 'https://example.com/controller-charger', 'https://dummyimage.com/900x600/e5e7eb/111827.png&text=Controller+Charger', '2026-05-23', '2026-05-08 08:01:22', '2026-05-08 08:01:22'),
(17, 1, 1, 'Trip to Stockholm', 320.00, 'General', 'planned', 'Short weekend trip.', 'https://example.com/stockholm-trip', 'https://dummyimage.com/900x600/e5e7eb/111827.png&text=Stockholm+Trip', '2026-06-20', '2026-05-08 08:01:22', '2026-05-08 08:01:22'),
(18, 1, 1, 'Hotel in Riga', 180.00, 'General', 'planned', 'Hotel booking for two nights.', 'https://example.com/riga-hotel', 'https://dummyimage.com/900x600/e5e7eb/111827.png&text=Riga+Hotel', '2026-07-05', '2026-05-08 08:01:22', '2026-05-08 08:01:22'),
(19, 1, 1, 'Travel Backpack', 89.99, 'General', 'bought', 'Comfortable backpack for short trips.', 'https://example.com/travel-backpack', 'https://dummyimage.com/900x600/e5e7eb/111827.png&text=Travel+Backpack', '2026-06-01', '2026-05-08 08:01:22', '2026-05-08 08:01:22'),
(20, 1, 1, 'Passport Cover', 14.99, 'General', 'cancelled', 'Cover for passport and travel documents.', 'https://example.com/passport-cover', 'https://dummyimage.com/900x600/e5e7eb/111827.png&text=Passport+Cover', NULL, '2026-05-08 08:01:22', '2026-05-08 08:01:22'),
(21, 1, 1, 'Used Family Car', 18500.00, 'Very Long Folder Name For Layout Testing', 'planned', 'Large amount item to test folder card price layout.', 'https://example.com/used-family-car', 'https://dummyimage.com/900x600/e5e7eb/111827.png&text=Used+Family+Car', '2026-12-01', '2026-05-08 08:01:22', '2026-05-08 08:01:22'),
(22, 1, 1, 'Home Renovation Materials', 7200.00, 'Very Long Folder Name For Layout Testing', 'postponed', 'Another large amount item to test long names and big prices.', 'https://example.com/home-renovation', 'https://dummyimage.com/900x600/e5e7eb/111827.png&text=Home+Renovation', '2027-02-01', '2026-05-08 08:01:22', '2026-05-08 08:01:22'),
(23, 1, 1, 'Premium Sofa', 1499.99, 'Very Long Folder Name For Layout Testing', 'planned', 'Furniture item for layout and amount testing.', 'https://example.com/premium-sofa', 'https://dummyimage.com/900x600/e5e7eb/111827.png&text=Premium+Sofa', '2026-11-15', '2026-05-08 08:01:22', '2026-05-08 08:01:22'),
(24, 2, 1, 'DSP Amplifier', 699.00, 'Noortehnik', 'planned', 'Car audio amplifier with DSP.', 'https://example.com/dsp-amplifier', 'https://dummyimage.com/900x600/e5e7eb/111827.png&text=DSP+Amplifier', '2026-06-30', '2026-05-08 08:01:22', '2026-05-08 08:01:22'),
(25, 2, 1, 'Subwoofer Box', 249.00, 'Noortehnik', 'planned', 'Active subwoofer test item.', 'https://example.com/subwoofer-box', 'https://dummyimage.com/900x600/e5e7eb/111827.png&text=Subwoofer+Box', '2026-07-10', '2026-05-08 08:01:22', '2026-05-08 08:01:22'),
(26, 2, 1, 'Speaker Set', 129.99, 'Car Audio', 'bought', 'Front speaker set for car.', 'https://example.com/speaker-set', 'https://dummyimage.com/900x600/e5e7eb/111827.png&text=Speaker+Set', '2026-05-29', '2026-05-08 08:01:22', '2026-05-08 08:01:22'),
(27, 2, 1, 'Remote Bass Controller', 39.99, 'Car Audio', 'postponed', 'External controller for subwoofer volume.', 'https://example.com/bass-controller', 'https://dummyimage.com/900x600/e5e7eb/111827.png&text=Bass+Controller', '2026-08-01', '2026-05-08 08:01:22', '2026-05-08 08:01:22'),
(28, 2, 1, 'Summer T-Shirt', 19.99, 'Clothes', 'planned', 'Simple clothes item for user 2 folder testing.', 'https://example.com/summer-shirt', 'https://dummyimage.com/900x600/e5e7eb/111827.png&text=Summer+T-Shirt', '2026-06-12', '2026-05-08 08:01:22', '2026-05-08 08:01:22');

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
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT для таблицы `categories`
--
ALTER TABLE `categories`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=32;

--
-- AUTO_INCREMENT для таблицы `email_verification_tokens`
--
ALTER TABLE `email_verification_tokens`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT для таблицы `families`
--
ALTER TABLE `families`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT для таблицы `family_activity_logs`
--
ALTER TABLE `family_activity_logs`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=97;

--
-- AUTO_INCREMENT для таблицы `family_members`
--
ALTER TABLE `family_members`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=18;

--
-- AUTO_INCREMENT для таблицы `password_reset_tokens`
--
ALTER TABLE `password_reset_tokens`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT для таблицы `transactions`
--
ALTER TABLE `transactions`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=68;

--
-- AUTO_INCREMENT для таблицы `users`
--
ALTER TABLE `users`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT для таблицы `wishlist_folders`
--
ALTER TABLE `wishlist_folders`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT для таблицы `wishlist_items`
--
ALTER TABLE `wishlist_items`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=30;

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
