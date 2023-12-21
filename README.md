# ARM Viewer for VS Code

[![Version](https://vsmarketplacebadge.apphb.com/version/nilsonamaral.armview.svg)](https://marketplace.visualstudio.com/items?itemName=nilsonamaral.armview)
![Installs](https://vsmarketplacebadge.apphb.com/installs-short/nilsonamaral.armview.svg)

This extension displays a graphical preview of Azure Resource Manager (ARM) templates. The view will show all resources with the official Azure icons and also linkage between the resources. Uses the [Cytoscape.js library](http://js.cytoscape.org/)

You can drag and move icons as you wish, zoom in and out with the mouse wheel and drag the canvas to pan around. Clicking on a resource will show a small "infobox" with extra details. See [usage](#Usage) for more details and features.

Extension as been tested successfully against all 900+ [Azure Quickstart Templates](https://github.com/Azure/azure-quickstart-templates) 😁

![image](https://github.com/ncamaraljr7219/Armview-vscode-Master/assets/91233007/a2cca381-759b-4949-b403-cea60e8ae31b)

![image](https://github.com/ncamaraljr7219/Armview-vscode-Master/assets/91233007/8e55feca-9001-4050-81ab-bdb642cc413d)

![image](https://github.com/ncamaraljr7219/Armview-vscode-Master/assets/91233007/5b165ce7-7461-4c31-b283-6a82149a8e05)


# Usage

- Open a ARM template JSON file, and ensure it is active/focused
  - Click the eye symbol in the top right of the editor tab bar
    
  ![image](https://github.com/ncamaraljr7219/Armview-vscode-Master/assets/91233007/8b2307d3-b080-4444-ba8f-3d47407143b8)
- Or:
  - Open the VS Code command pallet with `Ctrl+Shift+P` or `⇧⌘P` on a mac
  - Start typing `ARM Viewer`
  - Pick `ARM Viewer: Preview ARM file graphically` from the list
- Or:
  - Use keyboard shortcut `Ctrl+Alt+Q`

## Basic Features

- Click on a resource to show popup 'infobox' for that resource, a selected subset of details will be shown.
- Click and drag on background to move and pan the view around.
- Zoom in and out with the mouse wheel.
- Drag icons around to layout as your wish, one tip is to click 'Re-fit' after moving to get the best view & zoom level.

## Toolbar

- Click the 'Labels' button to toggle labels from resource names to resource types.
- Click the 'Re-fit' button to refit the view to the best zoom level.
- Click the 'Snap' button to toggle snap to grid mode on/off.
- Click the 'Export' button to export as PNG, you will be prompted for a filename. The PNG will have a transparent background.
- Two auto layout modes are available:
  - 'Tree' lays out the nodes in a hierarchical manner, ok for small templates, also the default.
  - 'Grid' puts the nodes on a grid, better for large templates but will often not make logical sense.

## Parameter Files

By default the extension will try to use any `defaultValues` found in the parameters section of the template.

To apply a set of input parameters and overrides to the view, click 'Params' toolbar button. You will be prompted for a ARM parameters JSON file (e.g. `azuredeploy.parameters.json`). The values in the parameters JSON fill will be used in place of values set in the template

**azuredeploy.parameters.json**
```
{
    "$schema": "https://schema.management.azure.com/schemas/2015-01-01/deploymentParameters.json#",
    "contentVersion": "1.0.0.0",
    "parameters": {
         "hostingPlanName": {
            "value": "asp-sonarqube"
        },
         "webSiteName": {
            "value": "wa-sonarqube"
        },
         "sqlserverName": {
            "value": "sqlsrv-sonarqube"
        },
        "databaseName": {
            "value": "sqldb-sonarqube"
        },
        "skuName": {
            "value": "F1"
        },
        "skuCapacity": {
            "value": 1
        },
        "sqlAdministratorLogin": {
            "value": "## TO BE DEFINED ##"
        },
        "sqlAdministratorLoginPassword": {
            "value": "## TO BE DEFINED ##"
        }   
    }
}
```

## Resource Filters

The view can sometimes get very crowded, especially when you have many resources of the same time (e.g. NSG rules or Key Vault secrets). Click the 'Filter' toolbar button to apply a filter to the view. You will be prompted for a input string:

- This is a comma separated list of resource types you want _removed from the view_.
- A partial substring of the type can be used, e.g. `secrets` or `vaults/secrets` or `microsoft.keyvault/vaults/secrets`.
- Case does not matter.
- Entering an empty string will remove the filter.

## Linked Templates

The extension will attempt to locate and display linked templates, these resources will be shown grouped together in a shaded box. Linked template support comes with many limitations. This is an outline of how it works:

- If the resolved linked template URL is externally accessible, it will be downloaded and used. Results are cached to stop excessive HTTP calls.
- If the URL is not accessible, then an attempt is made to load the file locally based on a guess from the filename and parent dir extracted from the URL, e.g. `nested/linked.json`

**linked.json**
```
{
  "$schema": "https://schema.management.azure.com/schemas/2015-01-01/deploymentTemplate.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "simpleParam": {
      "defaultValue": "A simple name",
      "type": "string"
    }
  },
  "variables": {},
  "resources": [
    {
      "name": "directLink",
      "type": "microsoft.resources/deployments",
      "properties": {
        "templateLink": {
          "uri": "https://raw.githubusercontent.com/Azure/azure-quickstart-templates/master/quickstarts/microsoft.kubernetes/aks/azuredeploy.json"
        }
      }
    },
    {
      "name": "local1",
      "type": "microsoft.resources/deployments",
      "properties": {
        "templateLink": {
          "uri": "foo/blah/basic.json"
        }
      }
    },
    {
      "name": "local2",
      "type": "microsoft.resources/deployments",
      "properties": {
        "templateLink": {
          "uri": "{f}/web.json?rubbish=1"
        }
      },
      "dependsOn": ["web2"]
    },
    {
      "name": "web",
      "type": "microsoft.resources/deployments",
      "properties": {
        "templateLink": {
          "uri": "http://example.net/web.json"
        }
      }
    },
    {
      "name": "web2",
      "type": "microsoft.resources/deployments",
      "properties": {
        "templateLink": {
          "uri": "http://example.net/nested2/linked.json"
        }
      }
    },
    {
      "name": "two-deep",
      "type": "microsoft.resources/deployments",
      "properties": {
        "templateLink": {
          "uri": "http://example.net/nested2/two-deep.json"
        }
      }
    }
  ]
}
```

- If that fails, then the local filesystem of the VS Code workspace will be searched for the file. Some assumptions are made in this search:
  - The search will only happen if the linked file has a _different_ filename from the main/master template being viewed. Otherwise the search would just find the main template being viewed.
  - The linked template file should located somewhere under the path of the main template, sub-folders will be searched. If the file resides elsewhere outside this path it will not be located.
  - The first matching file will be used.
- If linked template URL or filename is dynamic based on template parameters it is very likely not to resolve, and will not be found.
- If the linked template can not be located/loaded then a icon representing the deployment will be shown as a fallback.
- Currently there is no cache for data fetched from external URLs.
- The layout of the icons/resources can initially be a bit strange, and will require some manual tidy up to look good. I'm investigating how to improve this.

# Notes

This project was created as a learning exercise, but was heavily inspired & influenced by the old ARMViz tool. ARMViz sadly seems to have been abandoned, it often has problems displaying some templates. Personally I wasn't a fan of look of the output, and found it hard to read. These are a few of the reasons why I created this project

A new based version based on the same code as this VS Code extension, can be found here: https://github.com/x-namaral/armview-web

## ARM Template JSON Support

ARM templates go outside the JSON specification and break it in a couple of areas:

- Support for comments in the JSON file (aka JSONC)
- Allowing the use of multi-line strings
  The extension supports both of these as far as is reasonably possible, multi-line strings in particular has no known spec on how it should be supported. The extension is also aware of the language server provided by the 'Azure Resource Manager Tools' extension and will accept files set to 'arm-template' as the language type.
