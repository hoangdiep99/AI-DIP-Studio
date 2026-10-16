import React from 'react';

/**
 * Vector Visual Icons for Studio Outfits & Hairstyles
 * Giúp người dùng nhìn vào là nhận diện ngay kiểu dáng trang phục và tóc
 */

export const OutfitVisual = ({ id, className = '' }) => {
  switch (id) {
    case 'somi-nam':
    case 'somi-nu':
    case 'somi-trang':
      return (
        <svg className={`visual-icon outfit-icon ${className}`} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="48" height="48" rx="10" fill="#1e2235" />
          {/* Shirt body */}
          <path d="M12 40V24L16 16H32L36 24V40H12Z" fill="#F8FAFC" />
          {/* Placket */}
          <path d="M22 18H26V40H22V18Z" fill="#E2E8F0" />
          {/* Buttons */}
          <circle cx="24" cy="22" r="1" fill="#94A3B8" />
          <circle cx="24" cy="28" r="1" fill="#94A3B8" />
          <circle cx="24" cy="34" r="1" fill="#94A3B8" />
          {/* Collar wings */}
          <path d="M16 16L24 22L20 15L16 16Z" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1" />
          <path d="M32 16L24 22L28 15L32 16Z" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1" />
          <path d="M20 15L24 18L28 15" stroke="#94A3B8" strokeWidth="1.2" fill="none" />
        </svg>
      );

    case 'vest-nam':
      return (
        <svg className={`visual-icon outfit-icon ${className}`} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="48" height="48" rx="10" fill="#1e2235" />
          {/* Suit coat */}
          <path d="M10 40V24L16 15H32L38 24V40H10Z" fill="#0F172A" />
          {/* White shirt triangle */}
          <path d="M20 15H28L24 25L20 15Z" fill="#F8FAFC" />
          {/* Red/burgundy Necktie */}
          <path d="M23 20H25L26 22L24.5 35L24 37L23.5 35L22 22L23 20Z" fill="#DC2626" />
          <path d="M22.5 19H25.5L25 22H23L22.5 19Z" fill="#991B1B" />
          {/* Suit lapels */}
          <path d="M14 17L22 29L20 39L10 40L10 24L14 17Z" fill="#1E293B" stroke="#334155" strokeWidth="0.8" />
          <path d="M34 17L26 29L28 39L38 40L38 24L34 17Z" fill="#1E293B" stroke="#334155" strokeWidth="0.8" />
          {/* Pocket square hint */}
          <rect x="13" y="27" width="5" height="1.5" rx="0.5" fill="#FFFFFF" />
        </svg>
      );

    case 'vest-nu':
      return (
        <svg className={`visual-icon outfit-icon ${className}`} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="48" height="48" rx="10" fill="#1e2235" />
          {/* Blazer body */}
          <path d="M11 40V24L17 15H31L37 24V40H11Z" fill="#1E1B4B" />
          {/* Inner silk blouse (Soft cream) */}
          <path d="M19 15H29L24 27L19 15Z" fill="#FEF3C7" />
          <path d="M22 20C22 22 26 22 26 20" stroke="#F59E0B" strokeWidth="0.8" fill="none" />
          {/* Women lapels - curved tailored */}
          <path d="M15 16L23 32L19 40L11 40L11 25L15 16Z" fill="#312E81" stroke="#4338CA" strokeWidth="0.8" />
          <path d="M33 16L25 32L29 40L37 40L37 25L33 16Z" fill="#312E81" stroke="#4338CA" strokeWidth="0.8" />
        </svg>
      );

    case 'aodai-trang':
      return (
        <svg className={`visual-icon outfit-icon ${className}`} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="48" height="48" rx="10" fill="#1e2235" />
          {/* Ao dai body */}
          <path d="M14 40V22L19 16H29L34 22V40H14Z" fill="#F8FAFC" />
          {/* Diagonal button placket (nút bấm chéo nách áo dài) */}
          <path d="M24 16C24 16 27 18 30 21" stroke="#CBD5E1" strokeWidth="1.2" strokeLinecap="round" />
          {/* High stand collar (Cổ áo dài truyền thống) */}
          <path d="M20 16C20 13.5 28 13.5 28 16V17.5C28 17.5 24 18 20 17.5V16Z" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1" />
          {/* Pearl brooch / Khuy ngọc đính cổ */}
          <circle cx="24" cy="18" r="1.8" fill="#FDE047" stroke="#CA8A04" strokeWidth="0.6" />
          <circle cx="24" cy="18" r="0.8" fill="#FFFFFF" />
          {/* Soft silk shading */}
          <path d="M22 24C22 30 20 36 17 40" stroke="#E2E8F0" strokeWidth="1" />
          <path d="M26 24C26 30 28 36 31 40" stroke="#E2E8F0" strokeWidth="1" />
        </svg>
      );

    case 'aodai-do':
      return (
        <svg className={`visual-icon outfit-icon ${className}`} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="48" height="48" rx="10" fill="#1e2235" />
          <path d="M14 40V22L19 16H29L34 22V40H14Z" fill="#DC2626" />
          <path d="M24 16C24 16 27 18 30 21" stroke="#F87171" strokeWidth="1.2" strokeLinecap="round" />
          <path d="M20 16C20 13.5 28 13.5 28 16V17.5C28 17.5 24 18 20 17.5V16Z" fill="#EF4444" stroke="#B91C1C" strokeWidth="1" />
          <circle cx="24" cy="18" r="1.8" fill="#FDE047" stroke="#CA8A04" strokeWidth="0.6" />
          <circle cx="24" cy="18" r="0.8" fill="#FFFFFF" />
          <path d="M22 24C22 30 20 36 17 40" stroke="#B91C1C" strokeWidth="1" />
          <path d="M26 24C26 30 28 36 31 40" stroke="#B91C1C" strokeWidth="1" />
        </svg>
      );

    case 'aodai-xanh':
      return (
        <svg className={`visual-icon outfit-icon ${className}`} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="48" height="48" rx="10" fill="#1e2235" />
          <path d="M14 40V22L19 16H29L34 22V40H14Z" fill="#1D4ED8" />
          <path d="M24 16C24 16 27 18 30 21" stroke="#60A5FA" strokeWidth="1.2" strokeLinecap="round" />
          <path d="M20 16C20 13.5 28 13.5 28 16V17.5C28 17.5 24 18 20 17.5V16Z" fill="#2563EB" stroke="#1E40AF" strokeWidth="1" />
          <circle cx="24" cy="18" r="1.8" fill="#FDE047" stroke="#CA8A04" strokeWidth="0.6" />
          <circle cx="24" cy="18" r="0.8" fill="#FFFFFF" />
        </svg>
      );

    case 'police':
      return (
        <svg className={`visual-icon outfit-icon ${className}`} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="48" height="48" rx="10" fill="#1e2235" />
          {/* Police olive shirt */}
          <path d="M12 40V23L17 15H31L36 23V40H12Z" fill="#2D4A32" />
          {/* Inner tie and collar */}
          <path d="M20 15H28L24 23L20 15Z" fill="#F8FAFC" />
          <path d="M23 18H25L26 21L24.5 32L24 33L23.5 32L22 21L23 18Z" fill="#1E293B" />
          {/* Red & Gold epaulets (cầu vai công an) */}
          <rect x="13" y="16" width="5" height="3" rx="1" fill="#DC2626" stroke="#FBBF24" strokeWidth="0.8" />
          <rect x="30" y="16" width="5" height="3" rx="1" fill="#DC2626" stroke="#FBBF24" strokeWidth="0.8" />
          {/* Green lapel */}
          <path d="M16 16L24 23L21 34L12 40V24L16 16Z" fill="#3B5E41" stroke="#1B3320" strokeWidth="0.8" />
          <path d="M32 16L24 23L27 34L36 40V24L32 16Z" fill="#3B5E41" stroke="#1B3320" strokeWidth="0.8" />
        </svg>
      );

    case 'army':
      return (
        <svg className={`visual-icon outfit-icon ${className}`} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="48" height="48" rx="10" fill="#1e2235" />
          {/* Military khaki-olive uniform */}
          <path d="M12 40V23L17 15H31L36 23V40H12Z" fill="#364935" />
          {/* Red military rank tabs on collar (ve áo quân hàm đỏ) */}
          <rect x="18" y="17" width="3" height="5" rx="0.5" fill="#DC2626" stroke="#F59E0B" strokeWidth="0.6" transform="rotate(-20 18 17)" />
          <rect x="27" y="16" width="3" height="5" rx="0.5" fill="#DC2626" stroke="#F59E0B" strokeWidth="0.6" transform="rotate(20 27 16)" />
          <path d="M16 15L24 22L32 15L35 23L24 28L13 23L16 15Z" fill="#4B6349" stroke="#253524" strokeWidth="0.8" />
          {/* Brass buttons */}
          <circle cx="24" cy="27" r="1.2" fill="#FBBF24" />
          <circle cx="24" cy="33" r="1.2" fill="#FBBF24" />
        </svg>
      );

    case 'doctor':
      return (
        <svg className={`visual-icon outfit-icon ${className}`} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="48" height="48" rx="10" fill="#1e2235" />
          {/* Inner blue shirt */}
          <path d="M12 40V23L17 15H31L36 23V40H12Z" fill="#0284C7" />
          {/* White lab coat */}
          <path d="M12 40V24L17 17L22 30L20 40H12Z" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="0.8" />
          <path d="M36 40V24L31 17L26 30L28 40H36Z" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="0.8" />
          {/* Stethoscope around neck */}
          <path d="M20 17C20 24 22 28 24 28C26 28 28 24 28 17" stroke="#334155" strokeWidth="1.5" strokeLinecap="round" fill="none" />
          <circle cx="24" cy="31" r="2" fill="#94A3B8" stroke="#334155" strokeWidth="1" />
        </svg>
      );

    case 'uniform':
      return (
        <svg className={`visual-icon outfit-icon ${className}`} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="48" height="48" rx="10" fill="#1e2235" />
          <path d="M12 40V24L16 16H32L36 24V40H12Z" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="0.8" />
          {/* Blue student tie / khăn quàng / nơ */}
          <path d="M22 17H26L27 20L24.5 30L24 31L23.5 30L21 20L22 17Z" fill="#2563EB" />
          <path d="M16 16L24 21L20 15L16 16Z" fill="#FFFFFF" stroke="#93C5FD" strokeWidth="1" />
          <path d="M32 16L24 21L28 15L32 16Z" fill="#FFFFFF" stroke="#93C5FD" strokeWidth="1" />
        </svg>
      );

    case 'graduation':
      return (
        <svg className={`visual-icon outfit-icon ${className}`} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="48" height="48" rx="10" fill="#1e2235" />
          {/* Black gown */}
          <path d="M11 40V24L16 16H32L37 24V40H11Z" fill="#09090B" />
          {/* V-shaped academic velvet sash (Vàng & Đỏ) */}
          <path d="M18 16L24 30L30 16L33 18L24 35L15 18L18 16Z" fill="#EAB308" />
          <path d="M20 16L24 27L28 16L29 17L24 29L19 17L20 16Z" fill="#DC2626" />
        </svg>
      );

    default:
      return (
        <svg className={`visual-icon outfit-icon ${className}`} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="48" height="48" rx="10" fill="#1e2235" />
          <path d="M13 40V25L17 17H31L35 25V40H13Z" fill="#475569" />
          <circle cx="24" cy="18" r="6" fill="#1e2235" />
        </svg>
      );
  }
};

export const HairVisual = ({ id, gender = 'male', className = '' }) => {
  if (id === 'keep') {
    return (
      <svg className={`visual-icon hair-icon ${className}`} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="48" height="48" rx="10" fill="#1e2235" />
        <circle cx="24" cy="24" r="14" stroke="#818CF8" strokeWidth="1.8" strokeDasharray="3 3" />
        <path d="M18 24L22 28L30 20" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <text x="24" y="42" textAnchor="middle" fill="#94A3B8" fontSize="8" fontWeight="700">TÓC GỐC</text>
      </svg>
    );
  }

  // Kiểu tóc Nữ
  if (gender === 'female') {
    switch (id) {
      case 'straight-long':
        return (
          <svg className={`visual-icon hair-icon ${className}`} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="48" height="48" rx="10" fill="#1e2235" />
            {/* Long straight cascading hair */}
            <path d="M14 26C13 33 13 42 13 44H18C18 36 19 28 19 26V21C19 15 21 11 24 11C27 11 29 15 29 21V26C29 28 30 36 30 44H35C35 42 35 33 34 26C33 17 31 9 24 9C17 9 15 17 14 26Z" fill="#090A0F" />
            <path d="M16 26C15 34 15 42 15 44" stroke="#475569" strokeWidth="0.8" />
            <path d="M32 26C33 34 33 42 33 44" stroke="#475569" strokeWidth="0.8" />
            {/* Face silhouette */}
            <path d="M19 20C19 26 21 29 24 29C27 29 29 26 29 20C29 15 27 13 24 13C21 13 19 15 19 20Z" fill="#FDE68A" />
          </svg>
        );

      case 'long-layered-waves':
      case 'wavy-curls':
        return (
          <svg className={`visual-icon hair-icon ${className}`} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="48" height="48" rx="10" fill="#1e2235" />
            {/* Layered waves */}
            <path d="M13 25C11 31 15 36 13 44H19C20 38 17 34 19 28C19 16 21 10 24 10C27 10 29 16 29 28C31 34 28 38 29 44H35C33 36 37 31 35 25C34 16 31 9 24 9C17 9 14 16 13 25Z" fill="#090A0F" />
            <path d="M14 27C12 32 16 36 14 43" stroke="#64748B" strokeWidth="1" strokeLinecap="round" />
            <path d="M34 27C36 32 32 36 34 43" stroke="#64748B" strokeWidth="1" strokeLinecap="round" />
            <path d="M19 20C19 26 21 29 24 29C27 29 29 26 29 20C29 15 27 13 24 13C21 13 19 15 19 20Z" fill="#FDE68A" />
          </svg>
        );

      case 'bob':
      case 'pixie-short':
        return (
          <svg className={`visual-icon hair-icon ${className}`} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="48" height="48" rx="10" fill="#1e2235" />
            {/* Bob curved around jaw */}
            <path d="M15 22C14 28 17 31 20 31L18 24C18 16 20 10 24 10C28 10 30 16 30 24L28 31C31 31 34 28 33 22C33 13 29 9 24 9C19 9 15 13 15 22Z" fill="#090A0F" />
            <path d="M19 20C19 26 21 29 24 29C27 29 29 26 29 20C29 15 27 13 24 13C21 13 19 15 19 20Z" fill="#FDE68A" />
          </svg>
        );

      case 'bun':
        return (
          <svg className={`visual-icon hair-icon ${className}`} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="48" height="48" rx="10" fill="#1e2235" />
            {/* Top Bun */}
            <circle cx="24" cy="9" r="6" fill="#090A0F" />
            <circle cx="24" cy="9" r="4.5" stroke="#475569" strokeWidth="0.8" />
            {/* Sleek hair pulled back */}
            <path d="M16 22C16 14 19 11 24 11C29 11 32 14 32 22C32 24 31 27 30 28C29 28 29 25 29 22C29 16 27 14 24 14C21 14 19 16 19 22C19 25 19 28 18 28C17 27 16 24 16 22Z" fill="#090A0F" />
            {/* Neat neck & face */}
            <path d="M19 20C19 26 21 29 24 29C27 29 29 26 29 20C29 15 27 14 24 14C21 14 19 15 19 20Z" fill="#FDE68A" />
          </svg>
        );

      case 'half-up':
      case 'ponytail':
        return (
          <svg className={`visual-icon hair-icon ${className}`} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="48" height="48" rx="10" fill="#1e2235" />
            {/* Tied ponytail */}
            <path d="M24 14C28 14 36 12 37 17C38 22 36 30 35 38H31C32 30 33 22 30 18L24 14Z" fill="#090A0F" />
            <ellipse cx="28" cy="15" rx="2.5" ry="4" fill="#F43F5E" />
            {/* Front head */}
            <path d="M16 22C16 14 19 11 24 11C28 11 30 14 30 22C28 24 28 22 28 20C28 15 26 13 24 13C21 13 19 15 19 20C19 24 18 26 16 22Z" fill="#090A0F" />
            <path d="M19 20C19 26 21 29 24 29C27 29 29 26 29 20C29 15 27 13 24 13C21 13 19 15 19 20Z" fill="#FDE68A" />
          </svg>
        );

      default:
        return (
          <svg className={`visual-icon hair-icon ${className}`} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="48" height="48" rx="10" fill="#1e2235" />
            <path d="M15 24C14 33 14 42 14 44H18C18 36 19 28 19 26V21C19 15 21 11 24 11C27 11 29 15 29 21V26C29 28 30 36 30 44H34C34 42 34 33 33 24C32 16 30 9 24 9C18 9 16 16 15 24Z" fill="#090A0F" />
            <path d="M19 20C19 26 21 29 24 29C27 29 29 26 29 20C29 15 27 13 24 13C21 13 19 15 19 20Z" fill="#FDE68A" />
          </svg>
        );
    }
  }

  // Kiểu tóc Nam
  switch (id) {
    case 'side-part':
      return (
        <svg className={`visual-icon hair-icon ${className}`} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="48" height="48" rx="10" fill="#1e2235" />
          {/* Male side part 7/3 */}
          <path d="M16 22C16 14 18 10 24 10C29 10 32 14 32 22L30 22C30 16 28 13 24 13C21 13 19 15 19 19L19 22H16Z" fill="#090A0F" />
          {/* Parting line */}
          <line x1="21" y1="10" x2="19" y2="16" stroke="#818CF8" strokeWidth="1.2" />
          {/* Clean sideburns */}
          <path d="M16 19V26L18 24V19H16Z" fill="#090A0F" />
          <path d="M32 19V26L30 24V19H32Z" fill="#090A0F" />
          <path d="M18 20C18 26 20 30 24 30C28 30 30 26 30 20C30 16 28 14 24 14C20 14 18 16 18 20Z" fill="#FED7AA" />
        </svg>
      );

    case 'undercut':
    case 'slick-back':
      return (
        <svg className={`visual-icon hair-icon ${className}`} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="48" height="48" rx="10" fill="#1e2235" />
          {/* Volumed top swept back */}
          <path d="M18 15C18 9 23 8 26 8C29 8 30 11 30 15C30 17 28 18 24 18C20 18 18 17 18 15Z" fill="#090A0F" />
          {/* Faded short sides */}
          <path d="M16 18V25L18 23V18H16Z" fill="#334155" />
          <path d="M32 18V25L30 23V18H32Z" fill="#334155" />
          <path d="M18 20C18 26 20 30 24 30C28 30 30 26 30 20C30 16 28 15 24 15C20 15 18 16 18 20Z" fill="#FED7AA" />
        </svg>
      );

    case 'short-neat':
    case 'crew-cut':
    case 'buzz-cut':
      return (
        <svg className={`visual-icon hair-icon ${className}`} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="48" height="48" rx="10" fill="#1e2235" />
          {/* Short neat trim */}
          <path d="M17 19C17 13 20 11 24 11C28 11 31 13 31 19C31 20 30 17 24 17C18 17 17 20 17 19Z" fill="#090A0F" />
          <path d="M16 19V25L18 23V19H16Z" fill="#090A0F" />
          <path d="M32 19V25L30 23V19H32Z" fill="#090A0F" />
          <path d="M18 20C18 26 20 30 24 30C28 30 30 26 30 20C30 16 28 14 24 14C20 14 18 16 18 20Z" fill="#FED7AA" />
        </svg>
      );

    case 'light-perm':
      return (
        <svg className={`visual-icon hair-icon ${className}`} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="48" height="48" rx="10" fill="#1e2235" />
          {/* Wavy textured top */}
          <path d="M16 17C17 13 19 9 24 9C29 9 31 13 32 17C30 16 28 18 26 16C24 18 22 15 20 17C18 16 17 17 16 17Z" fill="#090A0F" />
          <circle cx="21" cy="12" r="1.5" fill="#475569" />
          <circle cx="26" cy="12" r="1.5" fill="#475569" />
          <path d="M18 20C18 26 20 30 24 30C28 30 30 26 30 20C30 16 28 15 24 15C20 15 18 16 18 20Z" fill="#FED7AA" />
        </svg>
      );

    default:
      return (
        <svg className={`visual-icon hair-icon ${className}`} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="48" height="48" rx="10" fill="#1e2235" />
          <path d="M17 19C17 13 20 11 24 11C28 11 31 13 31 19C31 20 30 17 24 17C18 17 17 20 17 19Z" fill="#090A0F" />
          <path d="M18 20C18 26 20 30 24 30C28 30 30 26 30 20C30 16 28 14 24 14C20 14 18 16 18 20Z" fill="#FED7AA" />
        </svg>
      );
  }
};
