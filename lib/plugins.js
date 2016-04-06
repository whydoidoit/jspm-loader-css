//

import autoprefixer from '../autoprefixer'
import Core from 'css-modules-loader-core-source-map'

export const Plugins = {
  values: Core.values,
  localByDefault: Core.localByDefault,
  extractImports: Core.extractImports,
  scope: Core.scope,
  autoprefixer
}
