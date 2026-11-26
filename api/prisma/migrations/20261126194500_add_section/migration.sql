CREATE TABLE `Section` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(191) NOT NULL,
    `position` INTEGER NOT NULL,
    `courseId` INTEGER NOT NULL,

    UNIQUE INDEX `Section_courseId_position_key`(`courseId`, `position`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `Section`
    ADD CONSTRAINT `Section_courseId_fkey`
    FOREIGN KEY (`courseId`) REFERENCES `Course`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;
