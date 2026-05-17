from __future__ import annotations
from typing import List, Optional
from strawberry.dataloader import DataLoader


def make_loaders(db) -> "Loaders":
    return Loaders(db)


class Loaders:
    def __init__(self, db):
        self.institution_by_id = DataLoader(load_fn=_make_institution_loader(db))
        self.user_by_id = DataLoader(load_fn=_make_user_loader(db))
        self.kid_by_id = DataLoader(load_fn=_make_kid_loader(db))
        self.class_by_id = DataLoader(load_fn=_make_class_loader(db))
        self.admin_by_institution_id = DataLoader(load_fn=_make_admin_by_institution_loader(db))
        self.educators_by_institution_id = DataLoader(load_fn=_make_educators_by_institution_loader(db))
        self.classes_by_institution_id = DataLoader(load_fn=_make_classes_by_institution_loader(db))
        self.educators_by_class_id = DataLoader(load_fn=_make_educators_by_class_loader(db))
        self.kids_by_class_id = DataLoader(load_fn=_make_kids_by_class_loader(db))
        self.parents_by_kid_id = DataLoader(load_fn=_make_parents_by_kid_loader(db))
        self.kid_count_by_institution_id = DataLoader(load_fn=_make_kid_count_loader(db))
        self.class_count_by_institution_id = DataLoader(load_fn=_make_class_count_loader(db))
        self.educator_count_by_institution_id = DataLoader(load_fn=_make_educator_count_loader(db))


def _make_institution_loader(db):
    async def load(ids: List[str]) -> List[Optional[dict]]:
        docs = await db.institutions.find({"_id": {"$in": ids}}).to_list(len(ids))
        by_id = {d["_id"]: d for d in docs}
        return [by_id.get(i) for i in ids]
    return load


def _make_user_loader(db):
    async def load(ids: List[str]) -> List[Optional[dict]]:
        docs = await db.users.find({"_id": {"$in": ids}}).to_list(len(ids))
        by_id = {d["_id"]: d for d in docs}
        return [by_id.get(i) for i in ids]
    return load


def _make_kid_loader(db):
    async def load(ids: List[str]) -> List[Optional[dict]]:
        docs = await db.kids.find({"_id": {"$in": ids}}).to_list(len(ids))
        by_id = {d["_id"]: d for d in docs}
        return [by_id.get(i) for i in ids]
    return load


def _make_class_loader(db):
    async def load(ids: List[str]) -> List[Optional[dict]]:
        docs = await db.classes.find({"_id": {"$in": ids}}).to_list(len(ids))
        by_id = {d["_id"]: d for d in docs}
        return [by_id.get(i) for i in ids]
    return load


def _make_admin_by_institution_loader(db):
    async def load(institution_ids: List[str]) -> List[Optional[dict]]:
        docs = await db.users.find({
            "role": "admin",
            "institution_id": {"$in": institution_ids},
        }).to_list(len(institution_ids))
        by_inst = {d["institution_id"]: d for d in docs}
        return [by_inst.get(i) for i in institution_ids]
    return load


def _make_educators_by_institution_loader(db):
    async def load(institution_ids: List[str]) -> List[List[dict]]:
        docs = await db.users.find({
            "role": "educator",
            "institution_id": {"$in": institution_ids},
        }).to_list(1000)
        by_inst: dict[str, list] = {i: [] for i in institution_ids}
        for d in docs:
            inst_id = d.get("institution_id")
            if inst_id in by_inst:
                by_inst[inst_id].append(d)
        return [by_inst[i] for i in institution_ids]
    return load


def _make_classes_by_institution_loader(db):
    async def load(institution_ids: List[str]) -> List[List[dict]]:
        docs = await db.classes.find(
            {"institution_id": {"$in": institution_ids}}
        ).to_list(1000)
        by_inst: dict[str, list] = {i: [] for i in institution_ids}
        for d in docs:
            inst_id = d.get("institution_id")
            if inst_id in by_inst:
                by_inst[inst_id].append(d)
        return [by_inst[i] for i in institution_ids]
    return load


def _make_educators_by_class_loader(db):
    async def load(class_ids: List[str]) -> List[List[dict]]:
        class_docs = await db.classes.find({"_id": {"$in": class_ids}}).to_list(len(class_ids))
        by_class_id: dict[str, list] = {i: [] for i in class_ids}
        all_educator_ids: list[str] = []
        class_educator_map: dict[str, list[str]] = {}
        for c in class_docs:
            edu_ids = [str(e) for e in c.get("educator_user_ids", [])]
            class_educator_map[str(c["_id"])] = edu_ids
            all_educator_ids.extend(edu_ids)

        if all_educator_ids:
            user_docs = await db.users.find({"_id": {"$in": all_educator_ids}}).to_list(500)
            user_by_id = {str(u["_id"]): u for u in user_docs}
        else:
            user_by_id = {}

        for class_id in class_ids:
            for edu_id in class_educator_map.get(class_id, []):
                if edu_id in user_by_id:
                    by_class_id[class_id].append(user_by_id[edu_id])
        return [by_class_id[i] for i in class_ids]
    return load


def _make_kids_by_class_loader(db):
    async def load(class_ids: List[str]) -> List[List[dict]]:
        docs = await db.kids.find({"class_id": {"$in": class_ids}}).to_list(2000)
        by_class: dict[str, list] = {i: [] for i in class_ids}
        for d in docs:
            class_id = str(d.get("class_id", ""))
            if class_id in by_class:
                by_class[class_id].append(d)
        return [by_class[i] for i in class_ids]
    return load


def _make_parents_by_kid_loader(db):
    async def load(kid_ids: List[str]) -> List[List[dict]]:
        kid_docs = await db.kids.find({"_id": {"$in": kid_ids}}).to_list(len(kid_ids))
        by_kid_id: dict[str, list[str]] = {}
        all_parent_ids: list[str] = []
        for k in kid_docs:
            p_ids = [str(p) for p in k.get("parent_user_ids", [])]
            by_kid_id[str(k["_id"])] = p_ids
            all_parent_ids.extend(p_ids)

        if all_parent_ids:
            parent_docs = await db.users.find({"_id": {"$in": all_parent_ids}}).to_list(500)
            parent_by_id = {str(u["_id"]): u for u in parent_docs}
        else:
            parent_by_id = {}

        return [
            [parent_by_id[p] for p in by_kid_id.get(kid_id, []) if p in parent_by_id]
            for kid_id in kid_ids
        ]
    return load


def _make_kid_count_loader(db):
    async def load(institution_ids: List[str]) -> List[int]:
        counts = {i: 0 for i in institution_ids}
        pipeline = [
            {"$match": {"institution_id": {"$in": institution_ids}}},
            {"$group": {"_id": "$institution_id", "count": {"$sum": 1}}},
        ]
        async for row in db.kids.aggregate(pipeline):
            if row["_id"] in counts:
                counts[row["_id"]] = row["count"]
        return [counts[i] for i in institution_ids]
    return load


def _make_class_count_loader(db):
    async def load(institution_ids: List[str]) -> List[int]:
        counts = {i: 0 for i in institution_ids}
        pipeline = [
            {"$match": {"institution_id": {"$in": institution_ids}}},
            {"$group": {"_id": "$institution_id", "count": {"$sum": 1}}},
        ]
        async for row in db.classes.aggregate(pipeline):
            if row["_id"] in counts:
                counts[row["_id"]] = row["count"]
        return [counts[i] for i in institution_ids]
    return load


def _make_educator_count_loader(db):
    async def load(institution_ids: List[str]) -> List[int]:
        counts = {i: 0 for i in institution_ids}
        pipeline = [
            {"$match": {"role": "educator", "institution_id": {"$in": institution_ids}}},
            {"$group": {"_id": "$institution_id", "count": {"$sum": 1}}},
        ]
        async for row in db.users.aggregate(pipeline):
            if row["_id"] in counts:
                counts[row["_id"]] = row["count"]
        return [counts[i] for i in institution_ids]
    return load
