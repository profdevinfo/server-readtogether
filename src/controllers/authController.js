const { db } = require('../config/firebase');
const { getMessages } = require('../config/messages');

// Verify child login code and ensure it belongs to a familySubscription
exports.loginChild = async (req, res) => {
  const t = getMessages(req);
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: t.codeRequired });

    // 1. Look up the child in the childrens collection using the access code
    const snapshot = await db.collection('childrens').where('accessCode', '==', code.trim()).get();
    
    if (snapshot.empty) {
      return res.status(401).json({ error: t.invalidAccessCode });
    }

    const childDoc = snapshot.docs[0];
    const childData = { id: childDoc.id, ...childDoc.data() };

    // 2. Ensure the child belongs to a valid family subscription in familySubscriptions
    const subscriptionId = childData.subscriptionId || childData.familySubscriptionId;
    
    if(!childData.isActive){ // Default to true if not explicitly fals
      return res.status(403).json({ error: t.childNotActive });
    }
    if (!subscriptionId) {
      return res.status(403).json({ error: t.childNotLinked });
    }

    const subDoc = await db.collection('familySubscriptions').doc(subscriptionId).get();
    
    if (!subDoc.exists) {
      return res.status(403).json({ error: t.subscriptionNotFound });
    }

    const subData = subDoc.data();
    
    // 3. Verify the subscription status (active)
    if (subData.isActive === false) {
      return res.status(403).json({ error: t.subscriptionNotActive });
    }

    // Attach subscription and package info to the child data
    const childDataWithSubscription = {
      ...childData,
      subscriptionId: subscriptionId,
      booksPackId: subData.booksPackId || null,
      isActive: subData.isActive !== false
    };

    res.status(200).json({ role: 'child', user: childDataWithSubscription });
  } catch (error) {
    console.error('Error during child login:', error);
    res.status(500).json({ error: t.serverError });
  }
};

// Verify parent login code
exports.loginParent = async (req, res) => {
  const t = getMessages(req);
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: t.codeRequired });

    const snapshot = await db.collection('familySubscriptions').where('parentKey', '==', code.trim()).get();
    
    if (snapshot.empty) {
      return res.status(401).json({ error: t.invalidParentCode });
    }
    // 3. Verify the subscription status (active)
    const parentData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
    if (parentData.isActive === false) {
      return res.status(403).json({ error: t.subscriptionNotActive });
    }
    if (parentData.endDate && new Date(parentData.endDate) < new Date()) {
      return res.status(403).json({ error: t.subscriptionExpired });
    }
    res.status(200).json({ role: 'parent', user: parentData });
  } catch (error) {
    res.status(500).json({ error: t.serverError });
  }
};