-- Rename per review: טקטיקאי -> טקטיקן, ציידי כישרונות -> צייד כשרונות
update achievements set name_he = 'טקטיקן'       where key = 'all_formations';
update achievements set name_he = 'צייד כשרונות' where key = 'all_clubs';
