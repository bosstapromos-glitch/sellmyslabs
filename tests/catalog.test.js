import test from 'node:test';
import assert from 'node:assert/strict';
import {referenceIdentity,referenceSource,sellMySlabsCategory} from '../lib/catalog-identity';
import {restoreDraft} from '../lib/draft';

test('public research identity excludes seller photos, contact, certificate and asking price',()=>{
 const card={name:'Japanese Luffy #P043',category:'One Piece',grader:'BGS',grade:'9.5',cert:'private-cert',photos:['private-photo'],email:'private@example.com',asking:'149.00'};
 const before=JSON.stringify(card),identity=referenceIdentity(card);
 assert.equal(identity.title,card.name);assert.equal(identity.grading_company,'BGS');
 for(const key of ['cert','photos','email','asking'])assert.equal(Object.hasOwn(identity,key),false);
 assert.equal(JSON.stringify(card),before);
});
test('unsupported categories stay explicit and never become Pokemon',()=>{
 assert.equal(sellMySlabsCategory('Wrestling'),null);
 assert.equal(sellMySlabsCategory('One Piece'),'One Piece');
 const draft=restoreDraft(JSON.stringify({cards:[{name:'Test card',category:'Wrestling',grader:'PSA',grade:'10'}]}),()=> 'test-id');
 assert.equal(draft.cards[0].category,'');assert.equal(draft.cards[0].sourceCategory,'Wrestling');
});
test('graded slabs use ALT while raw and sealed products use TCGplayer',()=>{
 assert.equal(referenceSource({itemType:'Graded card'}),'ALT');
 assert.equal(referenceSource({grader:'PSA',grade:'10'}),'ALT');
 for(const itemType of ['Raw card','Sealed product'])assert.equal(referenceSource({itemType,grader:'PSA',grade:'10'}),'TCGplayer');
});
