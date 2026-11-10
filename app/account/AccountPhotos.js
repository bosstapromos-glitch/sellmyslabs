"use client";
import { useState } from "react";
import AccountPhoto from "./AccountPhoto";
import PhotoPager, { PHOTO_PAGE_SIZE } from "../components/PhotoPager";
import styles from "./Account.module.css";
export default function AccountPhotos({ id, count }) {
  const [page, setPage] = useState(0);
  const current = Math.min(
    page,
    Math.max(0, Math.ceil(count / PHOTO_PAGE_SIZE) - 1),
  );
  return (
    <>
      <div className={styles.photos}>
        {Array.from(
          {
            length: Math.min(
              PHOTO_PAGE_SIZE,
              count - current * PHOTO_PAGE_SIZE,
            ),
          },
          (_, offset) => {
            const index = current * PHOTO_PAGE_SIZE + offset;
            return <AccountPhoto key={index} id={id} index={index} />;
          },
        )}
      </div>
      <PhotoPager page={current} total={count} onChange={setPage} />
    </>
  );
}
