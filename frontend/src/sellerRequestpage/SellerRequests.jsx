import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { 
    collection, 
    query, 
    where, 
    onSnapshot, 
    doc, 
    updateDoc, 
    arrayUnion, 
    getDoc 
} from 'firebase/firestore';
import "./sellerRequests.css";

function SellerRequests() {
    const [orders, setOrders] = useState([]);
    const [donations, setDonations] = useState([]);
    const [activeTab, setActiveTab] = useState('sales');
    const [commentText, setCommentText] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!auth.currentUser) return;

        // 1. جلب طلبات الشراء
        const unsubOrders = onSnapshot(query(
            collection(db, "orders"), 
            where("sellerId", "==", auth.currentUser.uid)
        ), (snap) => {
            const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setOrders(data);
        });

        // 2. جلب طلبات التبرع
        const unsubDonations = onSnapshot(query(
            collection(db, "volunteer_requests"), 
            where("sellerId", "==", auth.currentUser.uid), 
            where("status", "in", ["approved_by_admin", "approved_by_donor", "approved", "rejected"])
        ), async (snap) => {
            const docs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            const updatedDocs = await Promise.all(docs.map(async (item) => {
                if (!item.productPhotoURL && item.productId) {
                    try {
                        const productRef = doc(db, "products", item.productId);
                        const productSnap = await getDoc(productRef);
                        if (productSnap.exists()) {
                            const pData = productSnap.data();
                            return { ...item, productPhotoURL: pData.photoURL || pData.image };
                        }
                    } catch (err) {
                        console.error("Error fetching photo:", err);
                    }
                }
                return item;
            }));
            
            setDonations(updatedDocs);
            setLoading(false);
        });

        return () => { 
            unsubOrders(); 
            unsubDonations(); 
        };
    }, []);

    // --- الموافقة على البيع ---
    const handleApproveOrder = async (order) => {
        if (window.confirm("Are you sure you want to approve this order?")) {
            try {

                // تحديث حالة الأوردر
                await updateDoc(doc(db, "orders", order.id), {
                    status: "approved",
                    updatedAt: new Date().toISOString()
                });

                // تعليم المنتج إنه اتباع
                await updateDoc(doc(db, "products", order.productId), {
                    isSold: true
                });

            } catch (e) {
                console.error("Approve Error:", e);
            }
        }
    };

    const handleAddComment = async (id, col) => {
        if (!commentText[id]?.trim()) return;

        const stage = col === "volunteer_requests" 
            ? 'donor_contact' 
            : 'direct_sales';

        try {
            await updateDoc(doc(db, col, id), {
                comments: arrayUnion({
                    text: commentText[id].trim(),
                    senderId: auth.currentUser.uid,
                    senderRole: 'seller',
                    stage: stage,
                    createdAt: new Date().toISOString()
                })
            });

            setCommentText({ 
                ...commentText, 
                [id]: "" 
            });

        } catch (e) {
            console.error("Comment Error:", e);
        }
    };

    const handleDonorApprove = async (reqId) => {
        if (window.confirm("هل أنت موافق على إعطاء هذا المنتج لهذا الطالب؟")) {
            try {
                await updateDoc(doc(db, "volunteer_requests", reqId), {
                    status: "approved_by_donor",
                    donorApproved: true,
                    updatedAt: new Date().toISOString()
                });
            } catch (e) { 
                console.error("Approve Error:", e); 
            }
        }
    };

    if (loading) {
        return <div className="loading">Loading dashboard...</div>;
    }

    return (
        <div className="seller-requests-container">

            <header className="seller-header-web">
                <h1 className="seller-title-web">Provider Dashboard</h1>

                <div className="admin-tabs">
                    <button 
                        className={activeTab === 'sales' ? 'active' : ''} 
                        onClick={() => setActiveTab('sales')}
                    >
                        Commercial Sales
                    </button>

                    <button 
                        className={activeTab === 'donations' ? 'active' : ''} 
                        onClick={() => setActiveTab('donations')}
                    >
                        Donations
                    </button>
                </div>
            </header>

            <div className="orders-grid-web">

                {(activeTab === 'sales' ? orders : donations).map((item) => {

                    const finalImage =
                        item.productPhotoURL ||
                        item.photoURL ||
                        (item.items && item.items[0]?.photoURL);

                    return (

                        <div
                            key={item.id}
                            className="seller-horizontal-card"
                            style={{
                                display: 'flex',
                                flexDirection: 'row',
                                background: '#fff',
                                marginBottom: '20px',
                                borderRadius: '15px',
                                border: '1px solid #eee',
                                minHeight: '200px',
                                overflow: 'hidden',
                                boxShadow: '0 4px 10px rgba(0,0,0,0.05)'
                            }}
                        >

                            {/* الصورة */}
                            <div
                                style={{
                                    width: '200px',
                                    minWidth: '200px',
                                    backgroundColor: '#f9f9f9',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRight: '1px solid #eee'
                                }}
                            >
                                {finalImage ? (
                                    <img
                                        src={finalImage}
                                        alt="product"
                                        style={{
                                            width: '100%',
                                            height: '100%',
                                            objectFit: 'cover'
                                        }}
                                        onError={(e) => {
                                            e.target.src =
                                                'https://via.placeholder.com/200?text=No+Image';
                                        }}
                                    />
                                ) : (
                                    <div
                                        style={{
                                            textAlign: 'center',
                                            color: '#ccc'
                                        }}
                                    >
                                        <p style={{ fontSize: '12px' }}>
                                            No Image
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* البيانات */}
                            <div
                                style={{
                                    flex: 1,
                                    padding: '20px',
                                    display: 'flex',
                                    flexDirection: 'column'
                                }}
                            >

                                <div
                                    className={`status-badge-web ${item.status}`}
                                    style={{ width: 'fit-content' }}
                                >
                                    {item.status
                                        ? item.status.replace(/_/g, ' ')
                                        : 'Pending'}
                                </div>

                                <h3
                                    style={{
                                        margin: '15px 0 5px 0',
                                        color: '#1a1a1a'
                                    }}
                                >
                                    {item.productName ||
                                        (item.items && item.items[0]?.name) ||
                                        "Product"}
                                </h3>

                                <p
                                    style={{
                                        margin: 0,
                                        fontWeight: '600',
                                        color: '#555'
                                    }}
                                >
                                    {activeTab === 'sales'
                                        ? `Buyer: ${item.buyerName || 'Student'}`
                                        : `Requester: ${item.requesterName || 'Student'}`
                                    }
                                </p>

                                <div style={{ marginTop: 'auto' }}>

                                    {/* زر الموافقة على البيع */}
                                    {activeTab === 'sales' &&
                                        item.status !== 'approved' && (
                                            <button
                                                className="approve-btn-web"
                                                style={{
                                                    backgroundColor: '#2563eb',
                                                    color: '#fff',
                                                    border: 'none',
                                                    padding: '10px 20px',
                                                    borderRadius: '8px',
                                                    cursor: 'pointer',
                                                    marginBottom: '10px'
                                                }}
                                                onClick={() => handleApproveOrder(item)}
                                            >
                                                Approve Sale
                                            </button>
                                        )}

                                    {/* زر موافقة التبرع */}
                                    {activeTab === 'donations' &&
                                        item.status === 'approved_by_admin' && (
                                            <button
                                                className="approve-btn-web"
                                                style={{
                                                    backgroundColor: '#10b981',
                                                    color: '#fff',
                                                    border: 'none',
                                                    padding: '10px 20px',
                                                    borderRadius: '8px',
                                                    cursor: 'pointer'
                                                }}
                                                onClick={() => handleDonorApprove(item.id)}
                                            >
                                                Confirm Giving
                                            </button>
                                        )}

                                </div>
                            </div>

                            {/* الشات */}
                            <div
                                style={{
                                    flex: 1.2,
                                    padding: '15px',
                                    borderLeft: '1px solid #eee',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    backgroundColor: '#fcfcfc'
                                }}
                            >

                                <div
                                    className="messages-list-web"
                                    style={{
                                        flex: 1,
                                        maxHeight: '120px',
                                        overflowY: 'auto'
                                    }}
                                >
                                    {item.comments
                                        ?.filter(c => c.stage !== 'admin_review')
                                        .map((c, i) => (
                                            <div
                                                key={i}
                                                className={`msg-bubble-web ${
                                                    c.senderId === auth.currentUser.uid
                                                        ? 'me'
                                                        : 'student'
                                                }`}
                                            >
                                                <p
                                                    style={{
                                                        margin: 0,
                                                        fontSize: '13px'
                                                    }}
                                                >
                                                    {c.text}
                                                </p>
                                            </div>
                                        ))}
                                </div>

                                <div
                                    className="chat-input-web"
                                    style={{
                                        display: 'flex',
                                        gap: '8px',
                                        marginTop: '10px'
                                    }}
                                >

                                    <input
                                        style={{
                                            flex: 1,
                                            padding: '8px 12px',
                                            borderRadius: '20px',
                                            border: '1px solid #ddd',
                                            fontSize: '14px'
                                        }}
                                        placeholder="Type a message..."
                                        value={commentText[item.id] || ""}
                                        onChange={(e) =>
                                            setCommentText(prev => ({
                                                ...prev,
                                                [item.id]: e.target.value
                                            }))
                                        }
                                    />

                                    <button
                                        style={{
                                            borderRadius: '20px',
                                            padding: '8px 15px',
                                            cursor: 'pointer'
                                        }}
                                        onClick={() =>
                                            handleAddComment(
                                                item.id,
                                                activeTab === 'sales'
                                                    ? "orders"
                                                    : "volunteer_requests"
                                            )
                                        }
                                    >
                                        Send
                                    </button>

                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default SellerRequests;