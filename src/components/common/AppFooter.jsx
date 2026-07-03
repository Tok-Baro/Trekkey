import React from "react";
import { ShieldCheck } from "lucide-react";
import styles from "./AppFooter.module.scss";

const footerLinks = ["개인정보처리방침", "이용약관", "운영정책", "이메일무단수집거부", "문의"];

export function AppFooter({ variant = "default" }) {
  const year = new Date().getFullYear();
  const variantClass = styles[variant] ?? "";

  const preventNavigation = (event) => {
    event.preventDefault();
  };

  return (
    <footer className={`${styles.footer} ${variantClass}`} aria-label="서비스 안내">
      <div className={styles.inner}>
        <div className={styles.brandBlock}>
          <div className={styles.brandMark} aria-hidden="true">
            <ShieldCheck size={18} />
          </div>
          <div>
            <strong>Trekkey</strong>
            <p>교내 비교과 대회 운영과 활동 이력 검증을 위한 통합 관리 서비스</p>
          </div>
        </div>

        <nav className={styles.linkList} aria-label="푸터 링크">
          {footerLinks.map((link) => (
            <a href="#" key={link} onClick={preventNavigation}>
              {link}
            </a>
          ))}
        </nav>

        <div className={styles.meta}>
          <span>© {year} Trekkey. All rights reserved.</span>
          <span>본 화면은 프로젝트 시연용 UI이며 실제 개인정보는 저장하지 않습니다.</span>
        </div>
      </div>
    </footer>
  );
}
