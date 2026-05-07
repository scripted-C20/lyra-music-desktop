import SvgIcon from './SvgIcon.vue'
import AppIcon from '@renderer/components/common/AppIcon.vue'

const req = require.context('@renderer/assets/svgs', false, /\.svg$/)
const requireAll = requireContext => requireContext.keys().map(requireContext)
requireAll(req)

export default app => {
  app.component('svg-icon', SvgIcon)
  app.component('app-icon', AppIcon)
}
