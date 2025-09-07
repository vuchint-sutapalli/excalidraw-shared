#!/usr/bin/env node

import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs-extra';
import prompts from 'prompts';
import { red, green, bold } from 'kolorist';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
    // 1. Get project name from command line or prompt
    const argvTargetDir = process.argv[2]?.trim();
    const defaultProjectName = 'my-vuchint-repo';

    let result: prompts.Answers<'projectName'>;

    try {
        result = await prompts(
            [
                {
                    type: argvTargetDir ? null : 'text',
                    name: 'projectName',
                    message: 'Project name:',
                    initial: defaultProjectName,
                },
            ],
            {
                onCancel: () => {
                    throw new Error(red('✖') + ' Operation cancelled');
                },
            }
        );
    } catch (cancelled: any) {
        console.log(cancelled.message);
        return;
    }

    const targetDir = argvTargetDir || result.projectName?.trim() || defaultProjectName;
    const root = path.resolve(process.cwd(), targetDir);

    // 2. Check if the directory exists
    if (fs.existsSync(root)) {
        console.error(red(`✖ Directory ${targetDir} already exists.`));
        process.exit(1);
    }

    console.log(`\nScaffolding project in ${root}...`);

    // 3. Copy template files from the 'template' directory
    const templateDir = path.resolve(__dirname, '..', 'template');
    await fs.copy(templateDir, root);

    // 4. The .gitignore file is often named 'gitignore' in templates to prevent it from being ignored. Rename it.
    if (fs.existsSync(path.join(root, 'gitignore'))) {
        fs.renameSync(path.join(root, 'gitignore'), path.join(root, '.gitignore'));
    }

    // 5. Update the new project's package.json with the correct name
    const pkgJsonPath = path.join(root, 'package.json');
    const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
    pkgJson.name = result.projectName || targetDir;
    fs.writeFileSync(pkgJsonPath, JSON.stringify(pkgJson, null, 2));

    // 6. Final instructions
    console.log(`\n${green('✔')} Done. Now run:\n`);
    console.log(`  cd ${targetDir}`);
    console.log(`  pnpm install`);
    console.log(`  pnpm dev`);
    console.log();
}

main().catch((e) => {
    console.error(e);
});
