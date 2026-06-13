// src/components/transactions/export-pdf-transactions.tsx
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Download, Loader2, FileText } from "lucide-react"
import { toast } from "sonner"

type Transaction = {
    id: string
    type: string
    montant: number
    description: string | null
    reference?: string | null
    verifiee: boolean
    dateTransaction: Date | string
    verifieePar?: {
        nom: string
        prenom?: string | null
    } | null
}

interface ExportPDFProps {
    transactions: Transaction[]
    boutiqueNom: string
}

export function ExportPDFTransactions({
    transactions,
    boutiqueNom,
}: ExportPDFProps) {
    const [chargement, setChargement] = useState(false)

    // Fonction de formatage FCFA
    const formatterMontant = (montant: number) => {
        const valeur = Math.round(montant)
        const valeurStr = valeur.toString()
        const parties = []
        for (let i = valeurStr.length; i > 0; i -= 3) {
            parties.unshift(valeurStr.substring(Math.max(0, i - 3), i))
        }
        const nombreFormate = parties.join(' ')
        return `${nombreFormate} FCFA`
    }

    const getFrenchType = (type: string) => {
        switch (type) {
            case "VERSEMENT": return "Versement"
            case "DEPENSE": return "Dépense"
            case "VIREMENT_BANCAIRE": return "Virement bancaire"
            case "RETRAIT": return "Retrait"
            case "VENTE": return "Vente"
            default: return type
        }
    }

    const exporterPDF = async () => {
        setChargement(true)

        try {
            const { default: jsPDF } = await import("jspdf")
            const { default: autoTable } = await import("jspdf-autotable")

            const doc = new jsPDF({
                orientation: "portrait",
                unit: "mm",
                format: "a4",
            })

            const pageWidth = doc.internal.pageSize.getWidth()
            const pageHeight = doc.internal.pageSize.getHeight()

            // Calcul des statistiques pour le rapport
            const totalVersements = transactions
                .filter(t => ["VERSEMENT", "VIREMENT_BANCAIRE"].includes(t.type) && t.verifiee)
                .reduce((sum, t) => sum + t.montant, 0)

            const totalDepenses = transactions
                .filter(t => ["DEPENSE", "RETRAIT"].includes(t.type) && t.verifiee)
                .reduce((sum, t) => sum + t.montant, 0)

            const enAttente = transactions.filter(t => !t.verifiee).length

            // === EN-TÊTE ===
            doc.setFillColor(37, 99, 235) // Bleu primaire
            doc.rect(0, 0, pageWidth, 30, "F")

            // Titre principal
            doc.setTextColor(255, 255, 255)
            doc.setFontSize(14)
            doc.setFont("helvetica", "bold")
            doc.text("Rapport des transactions : " + boutiqueNom, pageWidth / 2, 15, { align: "center" })

            // Date de génération
            doc.setFontSize(8)
            doc.setTextColor(200, 210, 255)
            const dateExport = new Date().toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
            })
            doc.text(`Généré le ${dateExport}`, pageWidth / 2, 20, { align: "center" })

            // === STATISTIQUES ===
            const currentY = 40

            // Fond gris clair pour les statistiques de synthèse
            doc.setFillColor(248, 250, 252)
            doc.roundedRect(14, currentY, pageWidth - 28, 30, 3, 3, "F")

            doc.setFontSize(9)
            doc.setTextColor(80, 80, 100)

            // Total Versements (inclus Versements physiques + Virements bancaires)
            doc.setFont("helvetica", "bold")
            doc.text("Total Versements :", 20, currentY + 7)
            doc.setFont("helvetica", "normal")
            doc.setTextColor(34, 197, 94) // Vert
            doc.setFontSize(10)
            doc.text(`+${formatterMontant(totalVersements)}`, 20, currentY + 13)

            // Total Dépenses (Dépenses + Retraits)
            doc.setFontSize(9)
            doc.setTextColor(80, 80, 100)
            doc.setFont("helvetica", "bold")
            doc.text("Total Dépenses :", 85, currentY + 7)
            doc.setFont("helvetica", "normal")
            doc.setTextColor(239, 68, 68) // Rouge
            doc.setFontSize(10)
            doc.text(`-${formatterMontant(totalDepenses)}`, 85, currentY + 13)

            // En Attente
            doc.setFontSize(9)
            doc.setTextColor(80, 80, 100)
            doc.setFont("helvetica", "bold")
            doc.text("En attente :", 150, currentY + 7)
            doc.setFont("helvetica", "normal")
            doc.setTextColor(245, 158, 11) // Orange
            doc.setFontSize(10)
            doc.text(`${enAttente} transaction(s)`, 150, currentY + 13)

            // === TABLEAU DE L'HISTORIQUE ===
            const rows = transactions.map((t, index) => {
                const date = typeof t.dateTransaction === "string" ? new Date(t.dateTransaction) : t.dateTransaction
                const typeText = getFrenchType(t.type)
                const description = t.description || "-"
                const statutText = t.verifiee ? "Vérifié" : "En attente"

                const isPositive = ["VERSEMENT"].includes(t.type)
                const montantFormate = `${isPositive ? "+" : "-"}${formatterMontant(t.montant)}`

                return [
                    (index + 1).toString(),
                    date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }),
                    date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
                    typeText,
                    description,
                    statutText,
                    montantFormate,
                ]
            })

            autoTable(doc, {
                startY: currentY + 38,
                head: [["N°", "Date", "Heure", "Type", "Description", "Statut", "Montant"]],
                body: rows,
                theme: "striped",
                headStyles: {
                    fillColor: [37, 99, 235],
                    textColor: 255,
                    fontSize: 7,
                    fontStyle: "bold",
                    halign: "center",
                    cellPadding: 3,
                },
                bodyStyles: {
                    fontSize: 7,
                    textColor: 60,
                    cellPadding: 3,
                    valign: "middle",
                },
                columnStyles: {
                    0: { halign: "center", cellWidth: 10 },
                    1: { halign: "center", cellWidth: 20 },
                    2: { halign: "center", cellWidth: 15 },
                    3: { halign: "left", cellWidth: 28 },
                    4: { cellWidth: "auto", overflow: "linebreak" },
                    5: { halign: "center", cellWidth: 20 },
                    6: { halign: "right", cellWidth: 32, fontStyle: "bold" },
                },
                alternateRowStyles: {
                    fillColor: [248, 250, 252],
                },
                margin: { left: 14, right: 14 },
                rowPageBreak: "auto",
                pageBreak: "auto",
                showHead: "everyPage",
                tableWidth: "auto",
                styles: {
                    overflow: "linebreak",
                    cellWidth: "wrap",
                },
                didDrawPage: function (data) {
                    const currentPageHeight = doc.internal.pageSize.getHeight()
                    doc.setDrawColor(220, 220, 230)
                    doc.setLineWidth(0.5)
                    doc.line(14, currentPageHeight - 12, pageWidth - 14, currentPageHeight - 12)
                },
            })

            // Pieds de page dynamiques
            const pageCount = doc.getNumberOfPages()
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i)
                const currentPageHeight = doc.internal.pageSize.getHeight()

                doc.setDrawColor(220, 220, 230)
                doc.setLineWidth(0.5)
                doc.line(14, currentPageHeight - 12, pageWidth - 14, currentPageHeight - 12)

                doc.setFontSize(7)
                doc.setTextColor(150, 150, 170)
                doc.setFont("helvetica", "normal")
                doc.text(
                    `Page ${i} / ${pageCount}`,
                    pageWidth / 2,
                    currentPageHeight - 6,
                    { align: "center" }
                )
            }

            // Téléchargement du fichier
            const nomFichier = `rapport_transactions_${boutiqueNom.replace(/\s+/g, "_")}_${new Date().toISOString().split('T')[0]}.pdf`
            doc.save(nomFichier)

            toast.success("PDF des transactions exporté avec succès !", {
                description: `${transactions.length} transaction(s) exportée(s)`,
            })
        } catch (erreur) {
            console.error("Erreur export PDF transactions:", erreur)
            toast.error("Erreur lors de l'export PDF", {
                description: "Vérifiez votre connexion et réessayez",
            })
        } finally {
            setChargement(false)
        }
    }

    return (
        <Button
            onClick={exporterPDF}
            variant="outline"
            disabled={chargement || transactions.length === 0}
            className="w-full sm:w-auto gap-2 bg-gradient-to-r from-blue-50 to-white border-blue-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200"
        >
            {chargement ? (
                <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Génération...
                </>
            ) : (
                <>
                    <FileText className="h-4 w-4 text-blue-600" />
                    Exporter Rapport
                </>
            )}
        </Button>
    )
}
