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
            <p>기관이 승인한 대학 활동을 개인정보 최소 공개로 발급·검증하는 플랫폼</p>
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
          <span>공개 화면에는 동의된 최소 정보만 표시하며 개인정보 원문은 블록체인에 저장하지 않습니다.</span>
        </div>
      </div>
    </footer>
  );
}
