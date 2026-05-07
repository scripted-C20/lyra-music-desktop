import { onMounted, onBeforeUnmount, watch, reactive, ref, nextTick } from '@common/utils/vueTools'


export default ({ visible, location, onHide }) => {
  const transition1 = 'transform, opacity'
  const transition2 = 'transform, opacity, top, left'
  let show = false
  const dom_menu = ref(null)
  const menuStyles = reactive({
    left: 0,
    top: 0,
    opacity: 0,
    transitionProperty: 'transform, opacity',
    transform: 'scale(.8, .7) translate(0,0)',
    pointerEvents: 'none',
  })

  const updatePosition = (currentLocation) => {
    if (!currentLocation) return
    const rootOffset = window.lx?.rootOffset ?? 0
    menuStyles.left = currentLocation.x - rootOffset + 2 + 'px'
    menuStyles.top = currentLocation.y - rootOffset + 'px'
  }
  const updateTransform = (currentLocation) => {
    if (!show || !currentLocation) return
    menuStyles.transform = `scale(1) translate(${handleGetOffsetXY(currentLocation.x, currentLocation.y)})`
  }
  const handleShow = () => {
    show = true
    updatePosition(location.value)
    menuStyles.opacity = 1
    menuStyles.pointerEvents = 'auto'
    nextTick(() => {
      if (!show || !dom_menu.value) return
      updateTransform(location.value)
    })
  }
  const handleHide = () => {
    menuStyles.opacity = 0
    menuStyles.transform = 'scale(.8, .7) translate(0, 0)'
    menuStyles.pointerEvents = 'none'
    show = false
  }
  const handleGetOffsetXY = (left, top) => {
    const menuEl = dom_menu.value
    if (!menuEl) return '0px, 0px'
    const listWidth = menuEl.clientWidth
    const listHeight = menuEl.clientHeight
    const dom_container_parant = menuEl.offsetParent
    if (!dom_container_parant) return '0px, 0px'
    const containerWidth = dom_container_parant.clientWidth
    const containerHeight = dom_container_parant.clientHeight
    const offsetWidth = containerWidth - left - listWidth
    const offsetHeight = containerHeight - top - listHeight
    let x = 0
    let y = 0
    if (containerWidth > listWidth && offsetWidth < 12) {
      x = offsetWidth - 12
    }
    if (containerHeight > listHeight && offsetHeight < 5) {
      y = offsetHeight - 5
    }
    return `${x}px, ${y}px`
  }
  const handleDocumentClick = (event) => {
    if (!show) return
    const menuEl = dom_menu.value
    if (!menuEl) return
    if (event.target == menuEl || menuEl.contains(event.target)) return

    if (show && menuStyles.transitionProperty != transition1) menuStyles.transitionProperty = transition1

    onHide()
  }

  watch(visible, visible => {
    visible ? handleShow() : handleHide()
  }, { immediate: true })

  watch(location, location => {
    updatePosition(location)
    if (!show) return
    if (menuStyles.transitionProperty != transition2) menuStyles.transitionProperty = transition2
    if (!dom_menu.value) {
      nextTick(() => {
        if (!show || !dom_menu.value) return
        updateTransform(location)
      })
      return
    }
    updateTransform(location)
  }, { deep: true, immediate: true })

  onMounted(() => {
    document.addEventListener('click', handleDocumentClick)
  })

  onBeforeUnmount(() => {
    show = false
    document.removeEventListener('click', handleDocumentClick)
  })

  return {
    dom_menu,
    menuStyles,
  }
}
