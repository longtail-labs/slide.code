// import React, { useState, useCallback, useEffect, useRef } from 'react'

// interface SubmenuItem {
//   label: string
//   onClick: () => void
// }

// interface MenuItem {
//   label: string
//   command?: string
//   icon?: React.ReactNode
//   onClick?: () => void
//   submenu?: SubmenuItem[]
// }

// interface ContextMenuProps {
//   items: MenuItem[]
//   children: React.ReactNode
//   isOpen?: boolean
//   position?: { x: number; y: number }
//   onClose?: () => void
// }

// const ContextMenu: React.FC<ContextMenuProps> = ({
//   children,
//   items,
//   isOpen: externalIsOpen,
//   position: externalPosition,
//   onClose
// }) => {
//   const [isOpen, setIsOpen] = useState(false)
//   const [position, setPosition] = useState({ x: 0, y: 0 })
//   const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null)
//   const menuRef = useRef<HTMLDivElement>(null)
//   const containerRef = useRef<HTMLDivElement>(null)

//   // Determine if the component is controlled externally
//   const controlled = externalIsOpen !== undefined && externalPosition !== undefined

//   // Handle click outside
//   useEffect(() => {
//     const handleClickOutside = (event: MouseEvent) => {
//       console.log('handleClickOutside', event)
//       if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
//         if (controlled) {
//           onClose?.()
//         } else {
//           setIsOpen(false)
//         }
//         setActiveSubmenu(null)
//       }
//     }

//     // Only add the listener if the menu is open
//     // if (controlled ? externalIsOpen : isOpen) {
//     //   document.addEventListener('mousedown', handleClickOutside)

//     //   return () => {
//     //     document.removeEventListener('mousedown', handleClickOutside)
//     //   }
//     // }
//   }, [controlled, externalIsOpen, isOpen, onClose])

//   // Adjust menu position to stay within viewport
//   const adjustPosition = useCallback((rawX: number, rawY: number) => {
//     if (!menuRef.current) return { x: rawX, y: rawY }

//     const { width, height } = menuRef.current.getBoundingClientRect()
//     const viewportWidth = window.innerWidth
//     const viewportHeight = window.innerHeight

//     let x = rawX
//     let y = rawY

//     // Adjust horizontal position
//     if (x + width > viewportWidth) {
//       x = viewportWidth - width - 10
//     }

//     // Adjust vertical position
//     if (y + height > viewportHeight) {
//       y = viewportHeight - height - 10
//     }

//     return { x, y }
//   }, [])

//   useEffect(() => {
//     if (controlled && externalPosition) {
//       const adjustedPos = adjustPosition(externalPosition.x, externalPosition.y)
//       setPosition(adjustedPos)
//     }
//   }, [controlled, externalPosition, adjustPosition])

//   const handleContextMenu = useCallback(
//     (e: MouseEvent) => {
//       e.preventDefault()
//       if (!controlled) {
//         const adjustedPos = adjustPosition(e.clientX, e.clientY)
//         setIsOpen(true)
//         setPosition(adjustedPos)
//       }
//     },
//     [controlled, adjustPosition]
//   )

//   useEffect(() => {
//     if (!controlled) {
//       document.addEventListener('contextmenu', handleContextMenu)
//     }

//     return () => {
//       if (!controlled) {
//         document.removeEventListener('contextmenu', handleContextMenu)
//       }
//     }
//   }, [handleContextMenu, controlled])

//   const MenuItemComponent = ({
//     item,
//     isSubmenuItem = false
//   }: {
//     item: MenuItem | SubmenuItem
//     isSubmenuItem?: boolean
//   }) => {
//     const hasSubmenu = 'submenu' in item && item.submenu && item.submenu.length > 0

//     return (
//       <div
//         className="relative"
//         onMouseEnter={() => (hasSubmenu ? setActiveSubmenu(item.label) : null)}
//         onMouseLeave={() => (hasSubmenu ? setActiveSubmenu(null) : null)}
//       >
//         <button
//           onClick={(e) => {
//             e.stopPropagation()
//             if (!hasSubmenu && item.onClick) {
//               item.onClick()
//               controlled ? onClose?.() : setIsOpen(false)
//             }
//           }}
//           className="w-full flex items-center justify-between gap-x-3.5 py-2 px-3 rounded-lg text-sm text-gray-800 hover:bg-gray-100 focus:outline-none focus:bg-gray-100"
//         >
//           <div className="flex items-center gap-2">
//             {'icon' in item && item.icon && <span className="text-gray-600">{item.icon}</span>}
//             <span>{item.label}</span>
//           </div>
//           {'command' in item && item.command && (
//             <span className="text-xs text-gray-500">{item.command}</span>
//           )}
//           {hasSubmenu && (
//             <svg
//               className="size-4"
//               xmlns="http://www.w3.org/2000/svg"
//               viewBox="0 0 24 24"
//               fill="none"
//               stroke="currentColor"
//               strokeWidth="2"
//               strokeLinecap="round"
//               strokeLinejoin="round"
//             >
//               <path d="m9 18 6-6-6-6" />
//             </svg>
//           )}
//         </button>

//         {hasSubmenu && activeSubmenu === item.label && (
//           <div className="absolute left-full top-0 min-w-48 bg-white shadow-md rounded-lg">
//             <div className="p-1 space-y-0.5">
//               {item.submenu?.map((subItem, index) => (
//                 <MenuItemComponent key={index} item={subItem} isSubmenuItem />
//               ))}
//             </div>
//           </div>
//         )}
//       </div>
//     )
//   }

//   return (
//     <div ref={containerRef} className="relative inline-flex h-full w-full">
//       {children}

//       {(controlled ? externalIsOpen : isOpen) && (
//         <div
//           ref={menuRef}
//           className="fixed min-w-48 bg-white shadow-md rounded-lg z-[9999]"
//           style={{
//             position: 'fixed',
//             top: `${position.y}px`,
//             left: `${position.x}px`,
//             pointerEvents: 'auto'
//           }}
//         >
//           <div className="p-1 space-y-0.5">
//             {items?.map((item, index) => <MenuItemComponent key={index} item={item} />)}
//           </div>
//         </div>
//       )}
//     </div>
//   )
// }

// export default ContextMenu
