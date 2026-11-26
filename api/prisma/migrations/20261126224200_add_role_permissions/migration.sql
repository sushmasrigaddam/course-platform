CREATE TABLE `Role` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `isSystem` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `Role_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Permission` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `key` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `isSystem` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `Permission_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `RolePermission` (
    `roleId` INTEGER NOT NULL,
    `permissionId` INTEGER NOT NULL,

    INDEX `RolePermission_permissionId_idx`(`permissionId`),
    PRIMARY KEY (`roleId`, `permissionId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `Role` (`name`, `description`, `isSystem`) VALUES
    ('ADMIN', 'Full platform administration', true),
    ('INSTRUCTOR', 'Manage own courses, modules, and lessons', true),
    ('STUDENT', 'Enroll in courses and track lesson progress', true);

INSERT INTO `Permission` (`key`, `description`, `isSystem`) VALUES
    ('read:profile', 'Read own profile', true),
    ('update:profile', 'Update own profile', true),
    ('delete:profile', 'Delete own profile', true),
    ('change:password', 'Change own password', true),
    ('read:course', 'Read course information', true),
    ('create:course', 'Create courses', true),
    ('update:course', 'Update manageable courses', true),
    ('delete:course', 'Delete manageable courses', true),
    ('publish:course', 'Change course publication status', true),
    ('read:course_students', 'Read students enrolled in manageable courses', true),
    ('read:category', 'Read categories', true),
    ('create:category', 'Create categories', true),
    ('update:category', 'Update categories', true),
    ('delete:category', 'Delete categories', true),
    ('read:module', 'Read modules', true),
    ('create:module', 'Create modules', true),
    ('update:module', 'Update modules', true),
    ('delete:module', 'Delete modules', true),
    ('read:lesson', 'Read lesson content', true),
    ('create:lesson', 'Create lessons', true),
    ('update:lesson', 'Update lessons', true),
    ('delete:lesson', 'Delete lessons', true),
    ('complete:lesson', 'Mark lessons complete', true),
    ('uncomplete:lesson', 'Undo lesson completion', true),
    ('read:enrollment', 'Read own course enrollments', true),
    ('create:enrollment', 'Enroll in courses', true),
    ('delete:enrollment', 'Leave courses', true),
    ('read:user', 'Read user profiles', true),
    ('update:user_role', 'Change user roles', true),
    ('delete:user', 'Delete users', true),
    ('read:role', 'Read roles', true),
    ('create:role', 'Create roles', true),
    ('update:role', 'Update roles and their permissions', true),
    ('delete:role', 'Delete roles', true),
    ('read:permission', 'Read permissions', true),
    ('create:permission', 'Create permissions', true),
    ('update:permission', 'Update permissions', true),
    ('delete:permission', 'Delete permissions', true),
    ('read:stats', 'Read platform statistics', true);

INSERT INTO `RolePermission` (`roleId`, `permissionId`)
SELECT r.`id`, p.`id`
FROM `Role` AS r
CROSS JOIN `Permission` AS p
WHERE r.`name` = 'ADMIN';

INSERT INTO `RolePermission` (`roleId`, `permissionId`)
SELECT r.`id`, p.`id`
FROM `Role` AS r
JOIN `Permission` AS p ON p.`key` IN (
    'read:course', 'create:course', 'update:course', 'delete:course', 'publish:course',
    'read:course_students', 'read:module', 'create:module', 'update:module', 'delete:module',
    'read:lesson', 'create:lesson', 'update:lesson', 'delete:lesson',
    'read:profile', 'change:password'
)
WHERE r.`name` = 'INSTRUCTOR';

INSERT INTO `RolePermission` (`roleId`, `permissionId`)
SELECT r.`id`, p.`id`
FROM `Role` AS r
JOIN `Permission` AS p ON p.`key` IN (
    'read:profile', 'update:profile', 'delete:profile', 'change:password',
    'read:course', 'read:module', 'read:lesson',
    'complete:lesson', 'uncomplete:lesson',
    'read:enrollment', 'create:enrollment', 'delete:enrollment'
)
WHERE r.`name` = 'STUDENT';

ALTER TABLE `User` ADD COLUMN `roleId` INTEGER NULL;

UPDATE `User` AS u
JOIN `Role` AS r ON r.`name` = u.`role`
SET u.`roleId` = r.`id`;

ALTER TABLE `User` MODIFY `roleId` INTEGER NOT NULL;
ALTER TABLE `User` DROP COLUMN `role`;
CREATE INDEX `User_roleId_idx` ON `User`(`roleId`);

ALTER TABLE `User`
    ADD CONSTRAINT `User_roleId_fkey`
    FOREIGN KEY (`roleId`) REFERENCES `Role`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `RolePermission`
    ADD CONSTRAINT `RolePermission_roleId_fkey`
    FOREIGN KEY (`roleId`) REFERENCES `Role`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `RolePermission`
    ADD CONSTRAINT `RolePermission_permissionId_fkey`
    FOREIGN KEY (`permissionId`) REFERENCES `Permission`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;
