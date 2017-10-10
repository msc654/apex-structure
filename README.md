# apex-structure

An extension that adds a structure view of the currently selected apex class in the Explorer panel. Currently designed to work along side the ForceCode extension(updates for sfdx extensions on the roadmap).

## Features

- Displays apex structure in the Explorer panel.

	\!\[feature X\]\(images/feature-x.png\)

- Selecting an item in the overview will scroll to and focus the editor on the corresponding line in the code.

	\!\[feature X\]\(images/feature-x.png\)

## Requirements

- The ForceCode extension must be install and configured.
- If the current org has a namespace then the force.json file must have the “prefix” attribute configured with the current org’s namespace.

	``` force.json code sample here ```

## Known Issues

	- Does not work with .trigger files

## Release Notes

Users appreciate release notes as you update your extension.

### 1.0.0

Initial release of apex-structure
