import { useEffect, useMemo, useRef, useState } from "react";
import axios from "../api";
import { getImageUrl } from "../api";
import { useNavigate } from "react-router-dom";
import styles from "./Instructors.module.css";

export default function Instructors() {
    const navigate = useNavigate();
    const [instructors, setInstructors] = useState([]);
    const [filtersOpen, setFiltersOpen] = useState(false);

    const [filters, setFilters] = useState({
        search: "",
        teaching_type: "",
        max_price: "",
        interests: [],
        sort_price: "" // "", "asc", "desc"
    });

    const dropdownRef = useRef(null);

    const interestsList = [
        "小学数学",
        "小学物理",
        "小学信息学",
        "中学数学",
        "中学物理",
        "中学信息学"
    ];

    useEffect(() => {
        fetchInstructors();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filters.search, filters.teaching_type, filters.max_price, filters.interests]);

    // zatvori dropdown klikom izvan
    useEffect(() => {
        const onDown = (e) => {
            if (!filtersOpen) return;
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setFiltersOpen(false);
            }
        };
        window.addEventListener("mousedown", onDown);
        return () => window.removeEventListener("mousedown", onDown);
    }, [filtersOpen]);

    const fetchInstructors = async () => {
        const params = {
            search: filters.search,
            teaching_type: filters.teaching_type,
            max_price: filters.max_price,
            interests: filters.interests.join(",")
        };
        const res = await axios.get("/instructors", { params });
        setInstructors(res.data || []);
    };

    const toggleInterest = (value) => {
        setFilters((f) => ({
            ...f,
            interests: f.interests.includes(value)
                ? f.interests.filter((i) => i !== value)
                : [...f.interests, value]
        }));
    };

    const clearFilters = () => {
        setFilters((f) => ({
            ...f,
            teaching_type: "",
            max_price: "",
            interests: [],
            sort_price: ""
        }));
    };

    // sortiranje (frontend)
    const displayedInstructors = useMemo(() => {
        const arr = [...instructors];

        if (filters.sort_price === "asc") {
            arr.sort((a, b) => {
                const ap = a?.min_price ?? Number.POSITIVE_INFINITY;
                const bp = b?.min_price ?? Number.POSITIVE_INFINITY;
                return ap - bp;
            });
        }

        if (filters.sort_price === "desc") {
            arr.sort((a, b) => {
                const ap = a?.min_price ?? Number.NEGATIVE_INFINITY;
                const bp = b?.min_price ?? Number.NEGATIVE_INFINITY;
                return bp - ap;
            });
        }

        return arr;
    }, [instructors, filters.sort_price]);

    const activeFiltersCount =
        (filters.teaching_type ? 1 : 0) +
        (filters.max_price ? 1 : 0) +
        (filters.interests.length > 0 ? 1 : 0) +
        (filters.sort_price ? 1 : 0);

    return (
        <div className={styles.page}>
            <h1>导师</h1>

            {/* TOP BAR */}
            <div className={styles.topBar}>
                <input
                    className={styles.searchInput}
                    type="text"
                    placeholder="搜索名字..."
                    value={filters.search}
                    onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                />

                <div className={styles.dropdownWrap} ref={dropdownRef}>
                    <button
                        type="button"
                        className={styles.filtersBtn}
                        onClick={() => setFiltersOpen((v) => !v)}
                    >
                        筛选
                        {activeFiltersCount > 0 && (
                            <span className={styles.badge}>{activeFiltersCount}</span>
                        )}
                        <span className={styles.chev} aria-hidden="true">
              ▾
            </span>
                    </button>

                    {filtersOpen && (
                        <div className={styles.dropdown}>
                            <div className={styles.dropdownSection}>
                                <div className={styles.sectionTitle}>授课方式</div>
                                <select
                                    className={styles.control}
                                    value={filters.teaching_type}
                                    onChange={(e) =>
                                        setFilters((f) => ({ ...f, teaching_type: e.target.value }))
                                    }
                                >
                                    <option value="">全部</option>
                                    <option value="线下">线下</option>
                                    <option value="在线">在线</option>
                                    <option value="线下和线上">线下和线上</option>
                                </select>
                            </div>

                            <div className={styles.dropdownSection}>
                                <div className={styles.sectionTitle}>最高价格 (€)</div>
                                <input
                                    className={styles.control}
                                    type="number"
                                    placeholder="npr. 15"
                                    value={filters.max_price}
                                    onChange={(e) =>
                                        setFilters((f) => ({ ...f, max_price: e.target.value }))
                                    }
                                />
                            </div>

                            <div className={styles.dropdownSection}>
                                <div className={styles.sectionTitle}>科目</div>
                                <div className={styles.interestsList}>
                                    {interestsList.map((i) => (
                                        <label key={i} className={styles.interestItem}>
                                            <input
                                                type="checkbox"
                                                checked={filters.interests.includes(i)}
                                                onChange={() => toggleInterest(i)}
                                            />
                                            <span>{i}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className={styles.dropdownSection}>
                                <div className={styles.sectionTitle}>按价格排序</div>
                                <select
                                    className={styles.control}
                                    value={filters.sort_price}
                                    onChange={(e) =>
                                        setFilters((f) => ({ ...f, sort_price: e.target.value }))
                                    }
                                >
                                    <option value="">不排序</option>
                                    <option value="asc">升序</option>
                                    <option value="desc">降序</option>
                                </select>
                            </div>

                            <div className={styles.dropdownActions}>
                                <button type="button" className={styles.clearBtn} onClick={clearFilters}>
                                    清除
                                </button>
                                <button
                                    type="button"
                                    className={styles.closeBtn}
                                    onClick={() => setFiltersOpen(false)}
                                >
                                    完成
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className={styles.grid}>
                {displayedInstructors.map((i) => (
                    <div
                        key={i.id}
                        className={styles.card}
                        onClick={() => navigate(`/instructors/${i.id}`)}
                    >
                        <img
                            src={i.profile_picture ? getImageUrl(i.profile_picture) : "/avatar.png"}
                            alt=""
                        />
                        <h3>
                            {i.name} {i.surname}
                            {i.is_verified && <span className={styles.verifiedBadge} title="已验证导师">✓</span>}
                        </h3>
                        {i.review_count > 0 && (
                            <p className={styles.rating}>
                                ⭐ {parseFloat(i.average_rating).toFixed(1)} ({i.review_count})
                            </p>
                        )}
                        <p>{i.teaching_type}</p>
                        {i.min_price != null ? (
                            <p>{i.min_price} € / sat</p>
                        ) : (
                            <p className={styles.noPrice}>没有空闲时间</p>
                        )}
                        <p>{i.city}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
