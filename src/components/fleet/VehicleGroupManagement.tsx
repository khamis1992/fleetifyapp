import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { Plus, Users, Edit, Trash2 } from "lucide-react";
import { useVehicleGroups, useCreateVehicleGroup, useUpdateVehicleGroup, useDeleteVehicleGroup } from "@/hooks/useVehicleGroups";

interface VehicleGroupManagementProps {
  companyId: string;
}

interface GroupFormData {
  group_name: string;
  group_name_ar?: string;
  description?: string;
  parent_group_id?: string;
}

export function VehicleGroupManagement({ companyId }: VehicleGroupManagementProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState<any>(null);
  
  const { data: groups = [], isLoading } = useVehicleGroups();
  const createGroup = useCreateVehicleGroup();
  const updateGroup = useUpdateVehicleGroup();
  const deleteGroup = useDeleteVehicleGroup();

  const form = useForm<GroupFormData>({
    defaultValues: {
      group_name: "",
      group_name_ar: "",
      description: "",
      parent_group_id: "",
    }
  });

  const onSubmit = async (data: GroupFormData) => {
    try {
      if (editingGroup) {
        await updateGroup.mutateAsync({
          id: editingGroup.id,
          data: data
        });
      } else {
        await createGroup.mutateAsync(data);
      }
      setShowForm(false);
      setEditingGroup(null);
      form.reset();
    } catch (error) {
      console.error('Error saving group:', error);
    }
  };

  const handleEdit = (group: any) => {
    setEditingGroup(group);
    form.reset({
      group_name: group.group_name,
      group_name_ar: group.group_name_ar,
      description: group.description,
      parent_group_id: group.parent_group_id || "",
    });
    setShowForm(true);
  };

  const handleDelete = async (groupId: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذه المجموعة؟')) {
      await deleteGroup.mutateAsync(groupId);
    }
  };

  if (isLoading) {
    return <div>Loading groups...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">مجموعات المركبات</CardTitle>
            <CardDescription>تنظيم المركبات في مجموعات للإدارة الأفضل</CardDescription>
          </div>
          <Dialog open={showForm} onOpenChange={setShowForm}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={() => setEditingGroup(null)}>
                <Plus className="h-4 w-4 mr-2" />
                إضافة مجموعة
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingGroup ? 'تعديل المجموعة' : 'إضافة مجموعة جديدة'}
                </DialogTitle>
                <DialogDescription>
                  تحديد اسم المجموعة ووصفها لتنظيم المركبات
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <Label htmlFor="group_name">اسم المجموعة (بالإنجليزية)</Label>
                  <Input
                    id="group_name"
                    {...form.register("group_name", { required: true })}
                  />
                </div>
                <div>
                  <Label htmlFor="group_name_ar">اسم المجموعة (بالعربية)</Label>
                  <Input
                    id="group_name_ar"
                    {...form.register("group_name_ar")}
                  />
                </div>
                <div>
                  <Label htmlFor="parent_group_id">المجموعة الأب (اختياري)</Label>
                  <select
                    id="parent_group_id"
                    className="w-full p-2 border rounded"
                    {...form.register("parent_group_id")}
                  >
                    <option value="">لا يوجد</option>
                    {groups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.group_name_ar || group.group_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="description">الوصف</Label>
                  <textarea
                    id="description"
                    className="w-full p-2 border rounded"
                    rows={3}
                    {...form.register("description")}
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setShowForm(false);
                      setEditingGroup(null);
                      form.reset();
                    }}
                  >
                    إلغاء
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createGroup.isPending || updateGroup.isPending}
                  >
                    {(createGroup.isPending || updateGroup.isPending) ? "جاري الحفظ..." : "حفظ"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {groups.length > 0 ? (
          <div className="space-y-4">
            {groups.map((group) => (
              <div key={group.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <h4 className="font-medium">
                      {group.group_name_ar || group.group_name}
                    </h4>
                    {group.description && (
                      <p className="text-sm text-muted-foreground">{group.description}</p>
                    )}
                    {group.parent_group_id && (
                      <Badge variant="outline" className="mt-1">
                        مجموعة فرعية
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(group)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(group.id)}
                    disabled={deleteGroup.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">لا توجد مجموعات مركبات</p>
            <Button
              variant="outline"
              className="mt-2"
              onClick={() => setShowForm(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              إضافة مجموعة جديدة
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}